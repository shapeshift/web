const databaseName = 'shapeshift-notification-identity'
const storeName = 'keys'
const identityKey = 'identity'
const sessionKey = 'session'
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isoDatePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

export type StoredSession = {
  server: string
  keyId: string
  token: string
  userId: string
  expiresAt: string
}

// The stored key can't be used (corrupt record, or the browser can no longer use it)
export class DeviceKeyError extends Error {}

const encode = (value: ArrayBuffer): string => btoa(String.fromCharCode(...new Uint8Array(value)))
const toHex = (value: ArrayBuffer): string =>
  Array.from(new Uint8Array(value), byte => byte.toString(16).padStart(2, '0')).join('')
let pending: Promise<CryptoKeyPair> | undefined

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(storeName)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('Could not open device credential storage'))
  })

// Runs `run` in one transaction and resolves with its result once the transaction commits
const transact = async <T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => () => T,
): Promise<T> => {
  const db = await openDatabase()
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(storeName, mode)
      const result = run(transaction.objectStore(storeName))
      transaction.oncomplete = () => resolve(result())
      transaction.onerror = () => reject(new Error('Device credential storage failed'))
      transaction.onabort = () => reject(new Error('Device credential storage interrupted'))
    })
  } finally {
    db.close()
  }
}

const read = (key: string): Promise<unknown> =>
  transact('readonly', store => {
    const request = store.get(key)
    return () => request.result as unknown
  })

const isUsableKeyPair = (value: unknown): value is CryptoKeyPair => {
  const { privateKey, publicKey } = (value ?? {}) as Partial<CryptoKeyPair>
  return (
    privateKey?.type === 'private' &&
    publicKey?.type === 'public' &&
    privateKey.algorithm.name === 'ECDSA' &&
    (privateKey.algorithm as EcKeyAlgorithm).namedCurve === 'P-256' &&
    privateKey.usages.includes('sign')
  )
}

// Best effort: asks the browser to exempt the key from storage eviction (e.g. Safari's 7-day
// cap). Firefox shows a permission prompt for this, so it's skipped there.
const requestPersistentStorage = async (): Promise<void> => {
  try {
    if (/firefox\//i.test(navigator.userAgent) || !navigator.storage?.persist) return
    if (!(await navigator.storage.persisted())) await navigator.storage.persist()
  } catch {}
}

const getOrCreateKey = async (): Promise<CryptoKeyPair> => {
  const existing = await read(identityKey)
  if (isUsableKeyPair(existing)) return existing
  const candidate = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, [
    'sign',
    'verify',
  ])
  // Another tab may have stored a key meanwhile; the get and put share one transaction
  return transact('readwrite', store => {
    const result = { key: candidate }
    const request = store.get(identityKey)
    request.onsuccess = () => {
      if (isUsableKeyPair(request.result)) result.key = request.result
      else {
        store.put(candidate, identityKey)
        store.delete(sessionKey)
      }
    }
    return () => result.key
  })
}

export const getDeviceIdentity = (): Promise<CryptoKeyPair> => {
  if (pending === undefined) {
    pending = getOrCreateKey().catch(error => {
      pending = undefined
      throw error
    })
    void requestPersistentStorage()
  }
  return pending
}

// Discards a key that failed to export or sign and creates a new one (a new profile)
export const resetDeviceIdentity = async (): Promise<CryptoKeyPair> => {
  await transact('readwrite', store => {
    store.delete(identityKey)
    store.delete(sessionKey)
    return () => undefined
  })
  pending = undefined
  return getDeviceIdentity()
}

export const describeDeviceKey = async (
  keys: CryptoKeyPair,
): Promise<{ publicKey: string; keyId: string }> => {
  try {
    const spki = await crypto.subtle.exportKey('spki', keys.publicKey)
    return { publicKey: encode(spki), keyId: toHex(await crypto.subtle.digest('SHA-256', spki)) }
  } catch {
    throw new DeviceKeyError('Device key is unusable')
  }
}

export const exportDevicePublicKey = async (keys: CryptoKeyPair): Promise<string> =>
  (await describeDeviceKey(keys)).publicKey

export const signDeviceChallenge = async (
  keys: CryptoKeyPair,
  challenge: { id: string; message: string; expiresAt: string },
): Promise<string> => {
  const { keyId } = await describeDeviceKey(keys)
  // Only sign the exact login statement for this origin and key. Expiry is left to the server so
  // a skewed local clock doesn't lock the device out.
  const expected = `ShapeShift device authentication\nOrigin: ${window.location.origin}\nDevice: ${keyId}\nNonce: ${challenge.id}\nExpires: ${challenge.expiresAt}`
  if (
    !uuidPattern.test(challenge.id) ||
    !isoDatePattern.test(challenge.expiresAt) ||
    challenge.message !== expected
  )
    throw new Error('Invalid device challenge')
  try {
    return encode(
      await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        keys.privateKey,
        new TextEncoder().encode(challenge.message),
      ),
    )
  } catch {
    throw new DeviceKeyError('Device key is unusable')
  }
}

export const readStoredSession = async (): Promise<StoredSession | undefined> => {
  const value = (await read(sessionKey)) as Partial<StoredSession> | undefined
  if (
    typeof value?.server !== 'string' ||
    typeof value.keyId !== 'string' ||
    typeof value.token !== 'string' ||
    typeof value.userId !== 'string' ||
    typeof value.expiresAt !== 'string'
  )
    return undefined
  return value as StoredSession
}

export const storeSession = (session: StoredSession): Promise<void> =>
  transact('readwrite', store => {
    store.put(session, sessionKey)
    return () => undefined
  })

// Only removes the session if it still holds `token`, so a newer one from another tab survives
export const clearStoredSession = (token: string): Promise<void> =>
  transact('readwrite', store => {
    const request = store.get(sessionKey)
    request.onsuccess = () => {
      if ((request.result as StoredSession | undefined)?.token === token) store.delete(sessionKey)
    }
    return () => undefined
  })

// Serializes device login across tabs so they share one session instead of each logging in
export const withDeviceLock = <T>(run: () => Promise<T>): Promise<T> =>
  typeof navigator !== 'undefined' && navigator.locks?.request
    ? navigator.locks.request(databaseName, run)
    : run()
