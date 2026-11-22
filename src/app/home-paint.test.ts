import { describe, expect, it } from 'vitest';

import { isAppPaint } from '../../component-runtime/src/app-contract';
import { HOME_PAINT_KEY, homePaint, rememberHomePaint } from './home-paint';

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
}

describe('home paint', () => {
  it('remembers each home colour for its next opening', () => {
    const store = memoryStorage();
    expect(homePaint('maison-a', store)).toBeUndefined();
    rememberHomePaint('maison-a', 'rgb(10, 16, 36)', store);
    rememberHomePaint('maison-b', '#f6f3ee', store);
    expect(homePaint('maison-a', store)).toBe('rgb(10, 16, 36)');
    expect(homePaint('maison-b', store)).toBe('#f6f3ee');
  });

  it('keeps only plain colours', () => {
    const store = memoryStorage();
    for (const bad of ['url(https://evil.example/x)', 'red', 'var(--x)', 'linear-gradient(red, blue)', 'rgb(1,2,3);x:y']) {
      expect(isAppPaint(bad)).toBe(false);
      rememberHomePaint('maison-a', bad, store);
    }
    expect(store.getItem(HOME_PAINT_KEY)).toBeNull();
    store.setItem(HOME_PAINT_KEY, JSON.stringify({ 'maison-a': 'url(x)' }));
    expect(homePaint('maison-a', store)).toBeUndefined();
    expect(isAppPaint('rgba(10, 16, 36, 0.5)')).toBe(true);
  });
});
