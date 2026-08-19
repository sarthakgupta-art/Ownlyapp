import { create } from 'zustand';
import { primaryDepartment } from '@/catalog/departments';
import { storageKeys, store } from '@/lib/storage';

/** Cross-session UI preferences: the active department and recent searches. */

const MAX_SEARCHES = 8;

interface PreferencesState {
  departmentId: string;
  recentSearches: string[];
  ready: boolean;

  restore: () => Promise<void>;
  setDepartment: (id: string) => Promise<void>;
  noteSearch: (term: string) => Promise<void>;
  clearSearches: () => Promise<void>;
}

export const usePreferences = create<PreferencesState>((set, get) => ({
  departmentId: primaryDepartment.id,
  recentSearches: [],
  ready: false,

  restore: async () => {
    const [departmentId, recentSearches] = await Promise.all([
      store.get<string>(storageKeys.department),
      store.get<string[]>(storageKeys.recentSearches),
    ]);
    set({
      departmentId: departmentId ?? primaryDepartment.id,
      recentSearches: recentSearches ?? [],
      ready: true,
    });
  },

  setDepartment: async (id) => {
    set({ departmentId: id });
    await store.set(storageKeys.department, id);
  },

  noteSearch: async (term) => {
    const cleaned = term.trim();
    if (cleaned.length < 2) return;
    const next = [cleaned, ...get().recentSearches.filter((s) => s.toLowerCase() !== cleaned.toLowerCase())].slice(
      0,
      MAX_SEARCHES,
    );
    set({ recentSearches: next });
    await store.set(storageKeys.recentSearches, next);
  },

  clearSearches: async () => {
    set({ recentSearches: [] });
    await store.set(storageKeys.recentSearches, []);
  },
}));
