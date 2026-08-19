import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Chip, EmptyState, ErrorState, Loading, Screen } from '@/components/Layout';
import { ProductGrid } from '@/components/ProductGrid';
import { Text } from '@/components/Text';
import { Icon } from '@/components/Icon';
import { SetupNotice } from '@/components/SetupNotice';
import { departmentsWithFinder, getDepartment } from '@/catalog/departments';
import type { Department, FinderStep } from '@/catalog/types';
import {
  buildFinderQuery,
  canAdvance,
  describeAnswers,
  rankFinderResults,
  type FinderAnswers,
} from '@/finder/engine';
import { fetchProducts } from '@/shopify/api';
import { describeError } from '@/shopify/client';
import { isShopifyConfigured } from '@/config/env';
import { colors, layout, radius, spacing } from '@/theme/tokens';

/** Pulled deliberately wide, because ranking — not filtering — does the work. */
const CANDIDATE_POOL = 100;
const RESULTS_SHOWN = 24;

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.progressTrack} accessibilityRole="progressbar">
      <View style={[styles.progressFill, { width: `${((current + 1) / total) * 100}%` }]} />
    </View>
  );
}

function OptionRow({
  label,
  description,
  selected,
  onPress,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && styles.pressed]}
    >
      <View style={styles.optionText}>
        <Text variant="bodyStrong">{label}</Text>
        {description ? (
          <Text variant="caption" tone="muted" style={styles.optionDescription}>
            {description}
          </Text>
        ) : null}
      </View>
      <View style={[styles.check, selected && styles.checkSelected]}>
        {selected ? <Icon name="check" size={14} color={colors.onPrimary} strokeWidth={2.2} /> : null}
      </View>
    </Pressable>
  );
}

/** The quiz results, ranked against the answers. */
function FinderResults({
  department,
  answers,
  onRestart,
}: {
  department: Department;
  answers: FinderAnswers;
  onRestart: () => void;
}) {
  const query = useMemo(() => buildFinderQuery(department, answers), [department, answers]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['finder', department.id, query],
    queryFn: () => fetchProducts({ first: CANDIDATE_POOL, query, sortKey: 'BEST_SELLING' }),
  });

  const ranked = useMemo(
    () => (data ? rankFinderResults(data.items, department, answers).slice(0, RESULTS_SHOWN) : []),
    [data, department, answers],
  );

  const reasons = useMemo(() => {
    const out: Record<string, string> = {};
    for (const match of ranked) {
      if (match.reasons.length > 0) out[match.product.id] = match.reasons.join(' · ');
    }
    return out;
  }, [ranked]);

  const summary = department.finder ? describeAnswers(department.finder, answers) : [];

  if (isLoading) return <Loading label="Reading the catalogue…" />;
  if (error) return <ErrorState message={describeError(error)} onRetry={() => void refetch()} />;

  const header = (
    <View style={styles.resultsHeader}>
      <Text variant="title">Your shortlist</Text>
      <Text variant="caption" tone="muted" style={styles.resultsSubtitle}>
        Ranked against everything Ownly stocks in {department.label.toLowerCase()}.
      </Text>
      {summary.length > 0 ? (
        <View style={styles.summaryChips}>
          {summary.map((label, index) => (
            <Chip key={`${label}-${index}`} label={label} />
          ))}
        </View>
      ) : null}
      <Button label="Start over" variant="secondary" size="sm" onPress={onRestart} style={styles.restart} />
    </View>
  );

  if (ranked.length === 0) {
    return (
      <EmptyState
        title="Nothing quite fits"
        body="That combination is narrower than the catalogue. Loosen the budget or pick another family."
        actionLabel="Start over"
        onAction={onRestart}
      />
    );
  }

  return (
    <ProductGrid
      products={ranked.map((match) => match.product)}
      reasons={reasons}
      header={header}
      emptyTitle="Nothing quite fits"
    />
  );
}

export default function FinderScreen() {
  const params = useLocalSearchParams<{ department?: string }>();

  const available = departmentsWithFinder;
  const initial = getDepartment(params.department) ?? available[0];

  const [departmentId, setDepartmentId] = useState<string | undefined>(initial?.id);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<FinderAnswers>({});
  const [showResults, setShowResults] = useState(false);

  const department = getDepartment(departmentId) ?? available[0];
  const config = department?.finder;

  const restart = useCallback(() => {
    setAnswers({});
    setStepIndex(0);
    setShowResults(false);
  }, []);

  const select = useCallback((step: FinderStep, optionId: string) => {
    setAnswers((current) => {
      const selected = current[step.id] ?? [];
      if (step.multi) {
        const next = selected.includes(optionId)
          ? selected.filter((id) => id !== optionId)
          : [...selected, optionId];
        return { ...current, [step.id]: next };
      }
      // Tapping the chosen answer again clears it, so a single-select step is
      // still escapable without a separate "none of these" option.
      return { ...current, [step.id]: selected[0] === optionId ? [] : [optionId] };
    });
  }, []);

  if (!isShopifyConfigured) return <SetupNotice />;

  if (!department || !config) {
    return (
      <Screen>
        <AppHeader title="Finder" />
        <EmptyState
          title="No finder available"
          body="The discovery quiz appears here once a department defines one."
        />
      </Screen>
    );
  }

  if (showResults) {
    return (
      <Screen>
        <AppHeader title={config.title} showSearch />
        <FinderResults department={department} answers={answers} onRestart={restart} />
      </Screen>
    );
  }

  const step = config.steps[stepIndex];
  if (!step) {
    // Defensive: an empty `steps` array should not strand the screen.
    return (
      <Screen>
        <AppHeader title="Finder" />
        <EmptyState title="This finder has no questions yet" />
      </Screen>
    );
  }

  const isLast = stepIndex === config.steps.length - 1;
  const selected = answers[step.id] ?? [];

  return (
    <Screen>
      <AppHeader
        title={config.title}
        showBack={stepIndex > 0}
        subtitle={`Step ${stepIndex + 1} of ${config.steps.length}`}
      />
      <ProgressBar current={stepIndex} total={config.steps.length} />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {available.length > 1 && stepIndex === 0 ? (
          <View style={styles.departmentBar}>
            {available.map((dept) => (
              <Chip
                key={dept.id}
                label={dept.label}
                selected={dept.id === department.id}
                onPress={() => {
                  setDepartmentId(dept.id);
                  restart();
                }}
              />
            ))}
          </View>
        ) : null}

        <Text variant="title">{step.question}</Text>
        {step.helper ? (
          <Text variant="caption" tone="muted" style={styles.helper}>
            {step.helper}
          </Text>
        ) : null}

        <View style={styles.options}>
          {step.options.map((option) => (
            <OptionRow
              key={option.id}
              label={option.label}
              description={option.description}
              selected={selected.includes(option.id)}
              onPress={() => select(step, option.id)}
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {stepIndex > 0 ? (
          <Button label="Back" variant="ghost" onPress={() => setStepIndex((i) => i - 1)} />
        ) : null}
        <Button
          label={isLast ? 'See my shortlist' : step.optional && selected.length === 0 ? 'Skip' : 'Continue'}
          onPress={() => (isLast ? setShowResults(true) : setStepIndex((i) => i + 1))}
          disabled={!canAdvance(answers, step)}
          style={styles.primaryAction}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  progressTrack: { height: 2, backgroundColor: colors.surfaceSunk },
  progressFill: { height: 2, backgroundColor: colors.accent },
  body: { padding: layout.screenPadding, gap: spacing.sm, paddingBottom: spacing.xxl },
  departmentBar: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg, flexWrap: 'wrap' },
  helper: { marginBottom: spacing.sm },
  options: { gap: spacing.sm, marginTop: spacing.md },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    backgroundColor: colors.backgroundAlt,
  },
  optionSelected: { borderColor: colors.text, backgroundColor: colors.surfaceSunk },
  optionText: { flex: 1 },
  optionDescription: { marginTop: spacing.xxs },
  check: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: layout.screenPadding,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  primaryAction: { flex: 1 },
  resultsHeader: { paddingHorizontal: spacing.xs, paddingTop: spacing.lg, paddingBottom: spacing.md, gap: spacing.xs },
  resultsSubtitle: { maxWidth: 340 },
  summaryChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  restart: { alignSelf: 'flex-start', marginTop: spacing.md },
  pressed: { opacity: 0.8 },
});
