function memoryBackend() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

function defaultBackend() {
  try {
    const ls = globalThis.localStorage;
    if (ls) return ls;
  } catch {
    // access itself can throw (blocked site data)
  }
  return null;
}

export function createStorage(backend = defaultBackend()) {
  const store = backend ?? memoryBackend();
  return {
    load(key, fallback) {
      try {
        const raw = store.getItem(key);
        if (raw == null) return fallback;
        return JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    save(key, value) {
      try {
        store.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    remove(key) {
      try {
        store.removeItem(key);
      } catch {
        // ignore
      }
    },
  };
}
