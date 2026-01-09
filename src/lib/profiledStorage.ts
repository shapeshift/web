import localforage from 'localforage'

import { profiler } from './performanceProfiler'

export type ProfiledStorage = {
  getItem<T>(key: string): Promise<T | null>
  setItem<T>(key: string, value: T): Promise<T>
  removeItem(key: string): Promise<void>
}

export const createProfiledStorage = (enableProfiling: boolean): ProfiledStorage => {
  if (!enableProfiling) {
    return localforage as ProfiledStorage
  }

  return {
    async getItem<T>(key: string): Promise<T | null> {
      const start = performance.now()
      const result = await localforage.getItem<T>(key)
      const duration = performance.now() - start
      profiler.trackIndexedDB('read', duration, key)
      return result
    },

    async setItem<T>(key: string, value: T): Promise<T> {
      const start = performance.now()
      const result = await localforage.setItem<T>(key, value)
      const duration = performance.now() - start
      profiler.trackIndexedDB('write', duration, key)
      return result
    },

    removeItem(key: string): Promise<void> {
      return localforage.removeItem(key)
    },
  }
}

export const profiledStorage = createProfiledStorage(true)

const isLocalStorageAvailable = typeof localStorage !== 'undefined'

const localStorageAdapter: ProfiledStorage = {
  getItem<T>(key: string): Promise<T | null> {
    if (!isLocalStorageAvailable) return Promise.resolve(null)
    const start = performance.now()
    const item = localStorage.getItem(key)
    const duration = performance.now() - start
    profiler.trackIndexedDB('read', duration, `localStorage:${key}`)
    if (item === null) return Promise.resolve(null)
    try {
      return Promise.resolve(JSON.parse(item) as T)
    } catch {
      return Promise.resolve(null)
    }
  },

  setItem<T>(key: string, value: T): Promise<T> {
    if (!isLocalStorageAvailable) return Promise.resolve(value)
    const start = performance.now()
    localStorage.setItem(key, JSON.stringify(value))
    const duration = performance.now() - start
    profiler.trackIndexedDB('write', duration, `localStorage:${key}`)
    return Promise.resolve(value)
  },

  removeItem(key: string): Promise<void> {
    if (!isLocalStorageAvailable) return Promise.resolve()
    localStorage.removeItem(key)
    return Promise.resolve()
  },
}

export const createLocalStorageAdapter = (enableProfiling: boolean): ProfiledStorage => {
  if (!enableProfiling) {
    return {
      getItem<T>(key: string): Promise<T | null> {
        if (!isLocalStorageAvailable) return Promise.resolve(null)
        const item = localStorage.getItem(key)
        if (item === null) return Promise.resolve(null)
        try {
          return Promise.resolve(JSON.parse(item) as T)
        } catch {
          return Promise.resolve(null)
        }
      },
      setItem<T>(key: string, value: T): Promise<T> {
        if (!isLocalStorageAvailable) return Promise.resolve(value)
        localStorage.setItem(key, JSON.stringify(value))
        return Promise.resolve(value)
      },
      removeItem(key: string): Promise<void> {
        if (!isLocalStorageAvailable) return Promise.resolve()
        localStorage.removeItem(key)
        return Promise.resolve()
      },
    }
  }
  return localStorageAdapter
}
