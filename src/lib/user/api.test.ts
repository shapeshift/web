import { beforeEach, describe, expect, it, vi } from 'vitest'

const { post, request, getPushVerification } = vi.hoisted(() => ({
  post: vi.fn(),
  request: vi.fn(),
  getPushVerification: vi.fn(),
}))
vi.mock('axios', () => ({
  default: {
    create: () => ({ post, request }),
    isAxiosError: (error: { isAxiosError?: boolean }) => Boolean(error.isAxiosError),
  },
}))
vi.mock('./deviceIdentity', () => ({
  getDeviceIdentity: () => ({}),
  exportDevicePublicKey: () => 'public-key',
  signDeviceChallenge: () => 'proof',
}))
vi.mock('@/context/WalletProvider/MobileWallet/mobileMessageHandlers', () => ({
  getPushVerification,
}))
beforeEach(() => {
  vi.resetModules()
  post.mockReset()
  request.mockReset()
  getPushVerification.mockReset()
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
})
