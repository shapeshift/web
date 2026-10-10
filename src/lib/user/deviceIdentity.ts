const databaseName = 'shapeshift-notification-identity'
const encode = (value: ArrayBuffer): string => btoa(String.fromCharCode(...new Uint8Array(value)))
let pending: Promise<CryptoKeyPair> | undefined

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1)
    request.onupgradeneeded = () => request.result.createObjectStore('keys')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('Could not open device credential storage'))
  })

const getOrCreateKey = async (): Promise<CryptoKeyPair> => {
  const db = await openDatabase()
  try {
    const candidate = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign', 'verify'],
    )
    return await new Promise<CryptoKeyPair>((resolve, reject) => {
      const transaction = db.transaction('keys', 'readwrite')
      const store = transaction.objectStore('keys')
      const request = store.get('identity')
      const result = { key: candidate }
      request.onsuccess = () => {
        const existing = request.result as CryptoKeyPair | undefined
        if (existing) result.key = existing
        else store.put(candidate, 'identity')
      }
      transaction.oncomplete = () => resolve(result.key)
      transaction.onerror = () => reject(new Error('Could not store device credential'))
      transaction.onabort = () => reject(new Error('Device credential storage interrupted'))
    })
  } finally {
    db.close()
  }
}

export const getDeviceIdentity = (): Promise<CryptoKeyPair> => {
  if (pending === undefined)
    pending = getOrCreateKey().catch(error => {
      pending = undefined
      throw error
    })
  return pending
}
export const exportDevicePublicKey = async (keys: CryptoKeyPair): Promise<string> =>
  encode(await crypto.subtle.exportKey('spki', keys.publicKey))
export const signDeviceChallenge = async (
  keys: CryptoKeyPair,
  challenge: { id: string; message: string; expiresAt: string },
): Promise<string> => {
  const publicKey = await crypto.subtle.exportKey('spki', keys.publicKey)
  const keyId = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', publicKey)),
    value => value.toString(16).padStart(2, '0'),
  ).join('')
  const expiresAt = Date.parse(challenge.expiresAt)
  const expected = `ShapeShift device authentication\nOrigin: ${window.location.origin}\nDevice: ${keyId}\nNonce: ${challenge.id}\nExpires: ${challenge.expiresAt}`
  if (
    challenge.message !== expected ||
    !Number.isFinite(expiresAt) ||
    expiresAt <= Date.now() ||
    expiresAt > Date.now() + 10 * 60_000
  )
    throw new Error('Invalid device challenge')
  return encode(
    await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      keys.privateKey,
      new TextEncoder().encode(challenge.message),
    ),
  )
}
