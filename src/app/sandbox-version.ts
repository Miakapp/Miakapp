// The sandbox document's version, remembered on this device so a home's frame
// opens from the browser's cache (`/v/<version>/app.html`, immutable) with no
// round trip. It is read again in the background at each opening; a new
// version is used from the next opening on. Nothing here is a credential: the
// document is public, and the frame it loads is still confined by its own
// headers (CSP, permissions), which are cached with it.
import {
  APP_DOCUMENT_VERSION_PATH,
  isAppDocumentVersion,
} from '../../component-runtime/src/app-contract';

const KEY = 'miakapp.sandbox-version.v1';

function storage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

/** The version this device last read from this sandbox, if any. */
export function knownSandboxVersion(sandboxOrigin: string, store = storage()): string | undefined {
  try {
    const raw = store?.getItem(KEY);
    if (raw === null || raw === undefined) return undefined;
    const value = JSON.parse(raw) as { readonly origin?: unknown; readonly version?: unknown };
    return value.origin === sandboxOrigin && isAppDocumentVersion(value.version) ? value.version : undefined;
  } catch {
    return undefined;
  }
}

const refreshed = new Set<string>();

/** Reads the sandbox's current version once per page, for the next opening. */
export async function refreshSandboxVersion(
  sandboxOrigin: string,
  load: typeof fetch = globalThis.fetch.bind(globalThis),
  store = storage(),
): Promise<void> {
  if (refreshed.has(sandboxOrigin)) return;
  refreshed.add(sandboxOrigin);
  try {
    const response = await load(`${sandboxOrigin}${APP_DOCUMENT_VERSION_PATH}`, {
      cache: 'no-cache',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
    if (!response.ok) return;
    const body = await response.json() as { readonly schema?: unknown; readonly version?: unknown };
    if (body.schema !== 'miakapp.sandbox-version/1' || !isAppDocumentVersion(body.version)) return;
    store?.setItem(KEY, JSON.stringify({ origin: sandboxOrigin, version: body.version }));
  } catch {
    // Offline, or an older sandbox without versions: frame `/app.html` as before.
    refreshed.delete(sandboxOrigin);
  }
}
