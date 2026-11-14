import { beforeEach, describe, expect, it, vi } from 'vitest'

const { post, request, getPushVerification, identity } = vi.hoisted(() => {
  class DeviceKeyError extends Error {}
  const state = { stored: undefined as Record<string, string> | undefined }
  return {
    post: vi.fn(),
    request: vi.fn(),
    getPushVerification: vi.fn(),
    identity: {
      state,
      DeviceKeyError,
      getDeviceIdentity: vi.fn(() => Promise.resolve({})),
      resetDeviceIdentity: vi.fn(() => Promise.resolve({})),
      describeDeviceKey: () => Promise.resolve({ publicKey: 'public-key', keyId: 'key' }),
      signDeviceChallenge: vi.fn(() => Promise.resolve('proof')),
      readStoredSession: () => Promise.resolve(state.stored),
      storeSession: (value: Record<string, string>) => {
        state.stored = value
        return Promise.resolve()
      },
      clearStoredSession: vi.fn((token: string) => {
        if (state.stored?.token === token) state.stored = undefined
        return Promise.resolve()
      }),
      withDeviceLock: (run: () => Promise<unknown>) => run(),
    },
  }
})
vi.mock('axios', () => ({
  default: {
    create: () => ({ post, request }),
    isAxiosError: (error: { isAxiosError?: boolean }) => Boolean(error.isAxiosError),
  },
}))
vi.mock('./deviceIdentity', () => identity)
vi.mock('@/context/WalletProvider/MobileWallet/mobileMessageHandlers', () => ({
  getPushVerification,
}))
beforeEach(() => {
  vi.resetModules()
  post.mockReset()
  request.mockReset()
  getPushVerification.mockReset()
  identity.signDeviceChallenge.mockClear()
  identity.resetDeviceIdentity.mockClear()
  identity.clearStoredSession.mockClear()
  identity.state.stored = undefined
  vi.stubEnv('VITE_USER_SERVER_URL', 'https://profile.example')
  post.mockResolvedValueOnce({ data: { id: 'challenge' } }).mockResolvedValueOnce({
    data: {
      token: 'ab'.repeat(32),
      userId: 'profile',
      expiresAt: new Date(Date.now() + 600_000).toISOString(),
    },
  })
})

describe('device-authenticated profile requests', () => {
  it('authenticates silently and scopes reads to /me without sending wallet addresses', async () => {
    request.mockResolvedValue({ data: { id: 'profile' } })
    const { getUser } = await import('./api')
    expect(await getUser()).toEqual({ id: 'profile' })
    expect(post).toHaveBeenNthCalledWith(1, '/auth/device/challenge', { publicKey: 'public-key' })
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/me',
        headers: { Authorization: `Bearer ${'ab'.repeat(32)}` },
      }),
    )
  })

  it('confirms mobile delivery without trusting a caller-supplied profile ID', async () => {
    request
      .mockResolvedValueOnce({ data: { registrationId: 'registration' } })
      .mockResolvedValueOnce({ data: { device: { id: 'device' } } })
    getPushVerification.mockResolvedValue('nonce-from-native-app')
    const { getOrRegisterDevice } = await import('./api')
    await getOrRegisterDevice({
      userId: 'ignored-attacker-id',
      deviceType: 'MOBILE' as never,
      deviceToken: 'ExpoPushToken[testing]',
    })
    expect(request).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        url: '/me/devices',
        data: { deviceToken: 'ExpoPushToken[testing]', deviceType: 'MOBILE' },
      }),
    )
    expect(request).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        url: '/me/devices/confirm',
        data: { registrationId: 'registration', nonce: 'nonce-from-native-app' },
      }),
    )
  })

  it('renews a revoked access token once using the same device key', async () => {
    request
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 401 } })
      .mockResolvedValueOnce({ data: { id: 'profile' } })
    post.mockResolvedValueOnce({ data: { id: 'new-challenge' } }).mockResolvedValueOnce({
      data: {
        token: 'cd'.repeat(32),
        userId: 'profile',
        expiresAt: new Date(Date.now() + 600_000).toISOString(),
      },
    })
    const { getUser } = await import('./api')
    expect(await getUser()).toEqual({ id: 'profile' })
    expect(request).toHaveBeenLastCalledWith(
      expect.objectContaining({ headers: { Authorization: `Bearer ${'cd'.repeat(32)}` } }),
    )
  })

  it('shares one device login between concurrent requests', async () => {
    request.mockResolvedValue({ data: { id: 'profile' } })
    const { getUser } = await import('./api')
    await Promise.all([getUser(), getUser(), getUser()])
    expect(post).toHaveBeenCalledTimes(2)
    expect(request).toHaveBeenCalledTimes(3)
  })

  it('does not keep renewing when the renewed token is also rejected', async () => {
    const unauthorized = { isAxiosError: true, response: { status: 401 } }
    request.mockRejectedValue(unauthorized)
    post.mockResolvedValueOnce({ data: { id: 'new-challenge' } }).mockResolvedValueOnce({
      data: {
        token: 'cd'.repeat(32),
        userId: 'profile',
        expiresAt: new Date(Date.now() + 600_000).toISOString(),
      },
    })
    const { getUser } = await import('./api')
    await expect(getUser()).rejects.toBe(unauthorized)
    expect(post).toHaveBeenCalledTimes(4)
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('retries only transient failures', async () => {
    const { shouldRetryUserRequest } = await import('./api')
    const axiosError = (status?: number) =>
      Object.assign(new Error('request failed'), {
        isAxiosError: true,
        response: status ? { status } : undefined,
      })
    expect(shouldRetryUserRequest(0, axiosError())).toBe(true)
    expect(shouldRetryUserRequest(0, axiosError(503))).toBe(true)
    expect(shouldRetryUserRequest(3, axiosError(503))).toBe(false)
    expect(shouldRetryUserRequest(0, axiosError(429))).toBe(false)
    expect(shouldRetryUserRequest(0, new Error('Push verification was not received'))).toBe(false)
  })

  it('reuses the stored session after a reload instead of logging in again', async () => {
    request.mockResolvedValue({ data: { id: 'profile' } })
    await (await import('./api')).getUser()
    vi.resetModules()
    await (await import('./api')).getUser()
    expect(post).toHaveBeenCalledTimes(2)
    expect(request).toHaveBeenLastCalledWith(
      expect.objectContaining({ headers: { Authorization: `Bearer ${'ab'.repeat(32)}` } }),
    )
  })

  it('ignores a stored session issued by another user service', async () => {
    identity.state.stored = {
      server: 'https://other.example',
      keyId: 'key',
      token: 'ef'.repeat(32),
      userId: 'profile',
      expiresAt: new Date(Date.now() + 600_000).toISOString(),
    }
    request.mockResolvedValue({ data: { id: 'profile' } })
    await (await import('./api')).getUser()
    expect(post).toHaveBeenCalledTimes(2)
    expect(identity.state.stored?.token).toBe('ab'.repeat(32))
  })

  it('discards rejected tokens from storage, including a revoked renewal', async () => {
    request.mockRejectedValue({ isAxiosError: true, response: { status: 401 } })
    post.mockResolvedValueOnce({ data: { id: 'new-challenge' } }).mockResolvedValueOnce({
      data: {
        token: 'cd'.repeat(32),
        userId: 'profile',
        expiresAt: new Date(Date.now() + 600_000).toISOString(),
      },
    })
    await expect((await import('./api')).getUser()).rejects.toMatchObject({
      response: { status: 401 },
    })
    expect(identity.clearStoredSession.mock.calls).toEqual([['ab'.repeat(32)], ['cd'.repeat(32)]])
    expect(identity.state.stored).toBeUndefined()
  })

  it('replaces an unusable device key once', async () => {
    request.mockResolvedValue({ data: { id: 'profile' } })
    identity.signDeviceChallenge.mockImplementationOnce(() =>
      Promise.reject(new identity.DeviceKeyError('Device key is unusable')),
    )
    post.mockReset()
    post
      .mockResolvedValueOnce({ data: { id: 'challenge' } })
      .mockResolvedValueOnce({ data: { id: 'second-challenge' } })
      .mockResolvedValueOnce({
        data: {
          token: 'ab'.repeat(32),
          userId: 'profile',
          expiresAt: new Date(Date.now() + 600_000).toISOString(),
        },
      })
    expect(await (await import('./api')).getUser()).toEqual({ id: 'profile' })
    expect(identity.resetDeviceIdentity).toHaveBeenCalledTimes(1)
    expect(identity.signDeviceChallenge).toHaveBeenCalledTimes(2)
  })

  it('fails once without retrying when an old app has no push verification handler', async () => {
    request.mockResolvedValueOnce({ data: { registrationId: 'registration' } })
    const timeout = new Error('PostMessage getPushVerification timed out')
    getPushVerification.mockRejectedValue(timeout)
    const { getOrRegisterDevice, shouldRetryUserRequest } = await import('./api')
    const result = getOrRegisterDevice({
      userId: 'profile',
      deviceType: 'MOBILE' as never,
      deviceToken: 'ExpoPushToken[testing]',
    })
    await expect(result).rejects.toBe(timeout)
    expect(getPushVerification).toHaveBeenCalledTimes(1)
    expect(shouldRetryUserRequest(0, timeout)).toBe(false)
  })
})
