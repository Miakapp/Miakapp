// Each home's own background colour, as its app last painted it on this
// device, so the shell paints that colour from the very first frame of the
// next opening (and the installed app's launch, see index.html) instead of
// its own paper or night blue. Only a colour is kept, never anything the home
// shows; a home seen for the first time keeps the shell's colours.
import { isAppPaint } from '../../component-runtime/src/app-contract';

export const HOME_PAINT_KEY = 'miakapp.home-paint.v1';
const MAX_HOMES = 20;

function storage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

function readAll(store: Storage | undefined): Record<string, string> {
  try {
    const raw = store?.getItem(HOME_PAINT_KEY);
    const value = raw === null || raw === undefined ? {} : JSON.parse(raw) as unknown;
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([, colour]) => isAppPaint(colour))) as Record<string, string>;
  } catch {
    return {};
  }
}

export function homePaint(homeId: string, store = storage()): string | undefined {
  return readAll(store)[homeId];
}

export function rememberHomePaint(homeId: string, background: string, store = storage()): void {
  if (!isAppPaint(background)) return;
  const all = readAll(store);
  if (all[homeId] === background) return;
  delete all[homeId];
  all[homeId] = background;
  const kept = Object.entries(all).slice(-MAX_HOMES);
  try {
    store?.setItem(HOME_PAINT_KEY, JSON.stringify(Object.fromEntries(kept)));
  } catch {
    // Storage full or private mode: the next opening uses the shell's colours.
  }
}
