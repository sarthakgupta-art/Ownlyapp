import {
  allDepartments,
  departments,
  departmentsWithFinder,
  getDepartment,
  inferDepartment,
  primaryDepartment,
} from '@/catalog/departments';
import { scopeToQuery } from '@/catalog/query';

/**
 * Guard rails for the registry itself.
 *
 * A department whose scope compiles to an empty string matches the ENTIRE
 * catalogue rather than nothing, which is the single easiest way to break this
 * app while every screen still renders happily. These tests make that loud.
 */

describe('department registry', () => {
  it('has unique ids', () => {
    const ids = allDepartments.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has unique display orders', () => {
    const orders = allDepartments.map((d) => d.order);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it('is sorted by display order', () => {
    const orders = allDepartments.map((d) => d.order);
    expect([...orders].sort((a, b) => a - b)).toEqual(orders);
  });

  it('gives every department a non-empty scope, so none matches the whole catalogue', () => {
    for (const department of allDepartments) {
      expect(scopeToQuery(department.scope).length).toBeGreaterThan(0);
    }
  });

  it('gives every department at least one filterable attribute', () => {
    for (const department of allDepartments) {
      expect(department.attributes.some((a) => a.inFilters)).toBe(true);
    }
  });

  it('has unique attribute keys within each department', () => {
    for (const department of allDepartments) {
      const keys = department.attributes.map((a) => a.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('gives every attribute at least one source', () => {
    for (const department of allDepartments) {
      for (const attribute of department.attributes) {
        expect(attribute.sources.length).toBeGreaterThan(0);
      }
    }
  });

  it('has unique rail ids within each department', () => {
    for (const department of allDepartments) {
      const ids = department.rails.map((r) => r.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('exposes at least one enabled department', () => {
    expect(departments.length).toBeGreaterThan(0);
    expect(departments.every((d) => d.enabled)).toBe(true);
  });

  it('picks the first enabled department as primary', () => {
    expect(primaryDepartment.id).toBe(departments[0]?.id);
  });
});

describe('finder configs', () => {
  it('only lists enabled departments', () => {
    expect(departmentsWithFinder.every((d) => d.enabled && d.finder != null)).toBe(true);
  });

  it('gives every finder step at least one option and unique ids', () => {
    for (const department of allDepartments) {
      if (!department.finder) continue;
      const stepIds = department.finder.steps.map((s) => s.id);
      expect(new Set(stepIds).size).toBe(stepIds.length);

      for (const step of department.finder.steps) {
        expect(step.options.length).toBeGreaterThan(0);
        const optionIds = step.options.map((o) => o.id);
        expect(new Set(optionIds).size).toBe(optionIds.length);
      }
    }
  });

  it('never sets a price floor above its own ceiling', () => {
    for (const department of allDepartments) {
      for (const step of department.finder?.steps ?? []) {
        for (const option of step.options) {
          const { priceMin, priceMax } = option.match;
          if (priceMin != null && priceMax != null) {
            expect(priceMin).toBeLessThan(priceMax);
          }
        }
      }
    }
  });
});

describe('getDepartment', () => {
  it('finds disabled departments too, so a deep link still resolves', () => {
    expect(getDepartment('watches')?.id).toBe('watches');
  });

  it('returns undefined for an unknown or missing id', () => {
    expect(getDepartment('nope')).toBeUndefined();
    expect(getDepartment(undefined)).toBeUndefined();
    expect(getDepartment(null)).toBeUndefined();
  });
});

describe('inferDepartment', () => {
  it('matches a product to its department by product type', () => {
    expect(inferDepartment({ productType: 'Perfume', tags: [] }).id).toBe('fragrance');
    expect(inferDepartment({ productType: 'Lipstick', tags: [] }).id).toBe('beauty');
  });

  it('ignores case when matching a product type', () => {
    expect(inferDepartment({ productType: 'perfume', tags: [] }).id).toBe('fragrance');
  });

  it('falls back to the primary department for an unknown product', () => {
    expect(inferDepartment({ productType: 'Spaceship', tags: [] }).id).toBe(primaryDepartment.id);
  });

  it('never returns a disabled department', () => {
    expect(inferDepartment({ productType: 'Watch', tags: [] }).enabled).toBe(true);
  });
});
