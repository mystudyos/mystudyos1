// Lightweight browser cache utility (session/localStorage) with TTL
type StorageType = "session" | "local"

interface CacheEntry<T> {
  ts: number
  ttl?: number
  value: T
}

function isBrowser() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined"
}

export function readCache<T>(key: string, storage: StorageType = "session"): T | null {
  if (!isBrowser()) return null
  try {
    const raw = storage === "local" ? localStorage.getItem(key) : sessionStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CacheEntry<T>
    if (parsed.ttl && Date.now() - parsed.ts > parsed.ttl) {
      const st = storage === "local" ? localStorage : sessionStorage
      st.removeItem(key)
      return null
    }
    return parsed.value
  } catch (err) {
    console.warn("readCache error", err)
    return null
  }
}

export function writeCache<T>(key: string, value: T, storage: StorageType = "session", ttl?: number) {
  if (!isBrowser()) return
  try {
    const entry: CacheEntry<T> = { ts: Date.now(), ttl, value }
    const raw = JSON.stringify(entry)
    if (storage === "local") localStorage.setItem(key, raw)
    else sessionStorage.setItem(key, raw)
  } catch (err) {
    console.warn("writeCache error", err)
  }
}

export function clearCache(key: string) {
  if (!isBrowser()) return
  try {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  } catch {}
}

export function clearCachePrefix(prefix: string) {
  if (!isBrowser()) return
  try {
    const storages = [localStorage, sessionStorage]
    for (const st of storages) {
      for (let i = st.length - 1; i >= 0; i--) {
        const k = st.key(i)
        if (!k) continue
        if (k.startsWith(prefix)) st.removeItem(k)
      }
    }
  } catch {}
}
