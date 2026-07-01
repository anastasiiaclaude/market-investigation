import { describe, expect, it } from 'vitest';
import {
  DEFAULT_VIEW,
  loadView,
  parseView,
  saveView,
  VIEW_STORAGE_KEY,
} from './view-preference';

/** Minimal in-memory Storage stand-in for node tests (no jsdom). */
function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    read: (k: string) => map.get(k) ?? null,
  };
}

describe('parseView', () => {
  it('accepts the known views', () => {
    expect(parseView('table')).toBe('table');
    expect(parseView('cards')).toBe('cards');
  });

  it('falls back to the default for missing or invalid values', () => {
    expect(parseView(null)).toBe(DEFAULT_VIEW);
    expect(parseView('')).toBe(DEFAULT_VIEW);
    expect(parseView('grid')).toBe(DEFAULT_VIEW);
  });
});

describe('loadView / saveView', () => {
  it('loads the default when the key is unset', () => {
    expect(loadView(fakeStorage())).toBe(DEFAULT_VIEW);
  });

  it('round-trips a saved view', () => {
    const storage = fakeStorage();
    saveView(storage, 'cards');
    expect(storage.read(VIEW_STORAGE_KEY)).toBe('cards');
    expect(loadView(storage)).toBe('cards');
  });

  it('loads the default when the stored value is invalid', () => {
    expect(loadView(fakeStorage({ [VIEW_STORAGE_KEY]: 'nonsense' }))).toBe(DEFAULT_VIEW);
  });
});
