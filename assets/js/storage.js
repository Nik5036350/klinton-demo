// Safe access to browser storage. Storage can be missing, blocked (private
// windows, site data disabled) or full; every access is guarded so that a
// failure only means "nothing remembered", never a broken page.

const encoder = new TextEncoder();

function defaultStores() {
  return { session: globalThis.sessionStorage, local: globalThis.localStorage };
}

export function createStorage(getStores = defaultStores) {
  function store(kind) {
    if (kind !== 'session' && kind !== 'local') return null;
    try {
      return getStores()[kind] || null;
    } catch {
      return null;
    }
  }

  function read(kind, key) {
    const s = store(kind);
    if (!s) return null;
    try {
      const raw = s.getItem(key);
      return raw === null ? null : JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function write(kind, key, value, { maxBytes = 4096 } = {}) {
    const s = store(kind);
    if (!s) return false;
    let raw;
    try {
      raw = JSON.stringify(value);
    } catch {
      return false;
    }
    if (raw === undefined || encoder.encode(raw).length > maxBytes) return false;
    try {
      s.setItem(key, raw);
      return true;
    } catch {
      return false;
    }
  }

  function remove(kind, key) {
    const s = store(kind);
    if (!s) return;
    try {
      s.removeItem(key);
    } catch {
      // nothing to do: the value is unreachable either way
    }
  }

  return { read, write, remove };
}

const storage = createStorage();
export const { read, write, remove } = storage;
