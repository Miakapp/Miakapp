import { describe, expect, it } from 'vitest';

import { appDocumentPath } from '../../component-runtime/src/app-contract';
import { knownSandboxVersion, refreshSandboxVersion } from './sandbox-version';

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

const ORIGIN = 'https://sandbox.example';
const VERSION = 'bdl0zMrezQ2nyl_hCY_5ra4rH1VidZRM';

describe('sandbox document version', () => {
  it('frames the plain document until a version is known, then its immutable copy', async () => {
    const store = memoryStorage();
    expect(appDocumentPath(knownSandboxVersion(ORIGIN, store))).toBe('/app.html');
    const requests: string[] = [];
    await refreshSandboxVersion(ORIGIN, async (url) => {
      requests.push(String(url));
      return new Response(JSON.stringify({ schema: 'miakapp.sandbox-version/1', version: VERSION }));
    }, store);
    expect(requests).toEqual([`${ORIGIN}/version.json`]);
    expect(appDocumentPath(knownSandboxVersion(ORIGIN, store))).toBe(`/v/${VERSION}/app.html`);
    // Another sandbox origin never reuses it.
    expect(knownSandboxVersion('https://other.example', store)).toBeUndefined();
  });

  it('ignores a malformed answer and paths smuggled in as a version', async () => {
    const store = memoryStorage();
    await refreshSandboxVersion('https://bad.example', async () => new Response(JSON.stringify({
      schema: 'miakapp.sandbox-version/1', version: '../../evil.example/x',
    })), store);
    expect(knownSandboxVersion('https://bad.example', store)).toBeUndefined();
    expect(appDocumentPath('../x/../../y')).toBe('/app.html');
  });
});
