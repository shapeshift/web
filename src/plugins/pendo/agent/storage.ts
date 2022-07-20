import type { PendoStorage, PendoStorageWrapper } from './types'

function unmangledKey(key: string): string {
  const [, unmangled] =
    /^_pendo_(.*)\.([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/.exec(key) ?? []
  return unmangled ?? key
}

export function makeStorageWrapper(
  values?: Record<string, unknown>,
): [PendoStorage, PendoStorageWrapper] {
  const storage: PendoStorage = new Map(Object.entries(values ?? {}))
  const wrapper = {
    getItem(key: string) {
      const actualKey = unmangledKey(key)
      const out = storage.get(actualKey)
      if (out === undefined) return null
      if (typeof out !== 'string') return JSON.stringify(out)
      return out
    },
    setItem(key: string, value: string) {
      const actualKey = unmangledKey(key)
      const actualValue = (() => {
        try {
          return JSON.parse(value)
        } catch {
          return value
        }
      })()
      storage.set(actualKey, actualValue)
    },
    removeItem(key: string) {
      const actualKey = unmangledKey(key)
      storage.delete(actualKey)
    },
  }
  return [storage, wrapper]
}
