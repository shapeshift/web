import 'fake-indexeddb/auto'

import { createPublicKey, verify, webcrypto } from 'node:crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'

vi.stubGlobal('crypto', webcrypto)
afterAll(() => vi.unstubAllGlobals())

describe('device identity', () => {
  it('persists a non-extractable key and reuses it across reloads', async () => {
    const first = await import('./deviceIdentity')
    const [a, b] = await Promise.all([first.getDeviceIdentity(), first.getDeviceIdentity()])
    expect(a.privateKey).toBe(b.privateKey)
    expect(a.privateKey.extractable).toBe(false)
    const before = await first.exportDevicePublicKey(a)
    vi.resetModules()
    const second = await import('./deviceIdentity')
    const recovered = await second.getDeviceIdentity()
    expect(await second.exportDevicePublicKey(recovered)).toBe(before)
    expect(recovered.privateKey.extractable).toBe(false)
  })

  it('produces server-verifiable signatures only for its own origin and key', async () => {
    const { getDeviceIdentity, exportDevicePublicKey, signDeviceChallenge } = await import(
      './deviceIdentity'
    )
    const keys = await getDeviceIdentity()
    const spki = Buffer.from(await exportDevicePublicKey(keys), 'base64')
    const keyId = Buffer.from(await webcrypto.subtle.digest('SHA-256', spki)).toString('hex')
    const id = '00000000-0000-4000-8000-000000000001'
    const expiresAt = new Date(Date.now() + 60_000).toISOString()
    const message = `ShapeShift device authentication\nOrigin: ${window.location.origin}\nDevice: ${keyId}\nNonce: ${id}\nExpires: ${expiresAt}`
    const signature = await signDeviceChallenge(keys, { id, expiresAt, message })
    const publicKey = createPublicKey({ key: spki, format: 'der', type: 'spki' })
    expect(
      verify(
        'sha256',
        Buffer.from(message),
        { key: publicKey, dsaEncoding: 'ieee-p1363' },
        Buffer.from(signature, 'base64'),
      ),
    ).toBe(true)
    await expect(
      signDeviceChallenge(keys, {
        id,
        expiresAt,
        message: message.replace(window.location.origin, 'https://evil.example'),
      }),
    ).rejects.toThrow('Invalid device challenge')
    await expect(
      signDeviceChallenge(keys, { id: 'not-a-nonce', expiresAt, message }),
    ).rejects.toThrow('Invalid device challenge')
    // Expiry is enforced by the server, so a skewed local clock doesn't block signing
    const staleExpiry = new Date(0).toISOString()
    await expect(
      signDeviceChallenge(keys, {
        id,
        expiresAt: staleExpiry,
        message: message.replace(expiresAt, staleExpiry),
      }),
    ).resolves.toMatch(/^[A-Za-z0-9+/]{86}==$/)
  })

  it('replaces an unusable stored key and drops its session', async () => {
    const identity = await import('./deviceIdentity')
    await identity.storeSession({
      server: 'https://profile.example',
      keyId: 'old',
      token: 'ab'.repeat(32),
      userId: 'old-profile',
      expiresAt: new Date(Date.now() + 600_000).toISOString(),
    })
    const corrupt = await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('shapeshift-notification-identity', 1)
      request.onsuccess = () => {
        const transaction = request.result.transaction('keys', 'readwrite')
        transaction.objectStore('keys').put({ privateKey: 'garbage' }, 'identity')
        transaction.oncomplete = () => {
          request.result.close()
          resolve()
        }
        transaction.onerror = () => reject(transaction.error)
      }
    })
    expect(corrupt).toBeUndefined()
    vi.resetModules()
    const reloaded = await import('./deviceIdentity')
    const keys = await reloaded.getDeviceIdentity()
    expect(keys.privateKey.type).toBe('private')
    expect(await reloaded.readStoredSession()).toBeUndefined()

    const replaced = await reloaded.resetDeviceIdentity()
    expect(await reloaded.exportDevicePublicKey(replaced)).not.toBe(
      await reloaded.exportDevicePublicKey(keys),
    )
  })

  it('only clears the stored session it was asked to clear', async () => {
    const identity = await import('./deviceIdentity')
    const stored = {
      server: 'https://profile.example',
      keyId: 'key',
      token: 'cd'.repeat(32),
      userId: 'profile',
      expiresAt: new Date(Date.now() + 600_000).toISOString(),
    }
    await identity.storeSession(stored)
    await identity.clearStoredSession('ab'.repeat(32))
    expect(await identity.readStoredSession()).toEqual(stored)
    await identity.clearStoredSession(stored.token)
    expect(await identity.readStoredSession()).toBeUndefined()
  })
})
