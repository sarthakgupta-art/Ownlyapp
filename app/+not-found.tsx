import { useRouter } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState, Screen } from '@/components/Layout';

export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <Screen>
      <AppHeader title="Not found" showBack />
      <EmptyState
        title="That page does not exist"
        body="The link may be out of date, or the product may have been removed."
        actionLabel="Go to the shop"
        onAction={() => router.replace('/(tabs)')}
      />
    </Screen>
  );
}
