import { createSiweMessage } from 'viem/siwe'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { FiatRampAction } from '../../FiatRampsCommon'
import { createOnRamperUrl } from './index'

const { post, config } = vi.hoisted(() => ({
  post: vi.fn(),
  config: {
    VITE_ONRAMPER_SIGNING_URL: 'https://checkout.example',
    VITE_ONRAMPER_WIDGET_URL: 'https://buy.onramper.com/',
  },
}))
vi.mock('axios', () => ({
  default: {
    create: () => ({ post }),
    isAxiosError: (error: unknown) =>
      Boolean(error && typeof error === 'object' && 'response' in error),
  },
}))
vi.mock('@/config', () => ({ getConfig: () => config }))
vi.mock('./utils', () => ({
  getSupportedOnramperCurrencies: () => Promise.resolve({ message: { crypto: [], fiat: [] } }),
  findAssetIdByOnramperCrypto: vi.fn(),
  findOnramperTokenIdByAssetId: () => 'eth',
}))
const props = {
  action: FiatRampAction.Buy,
  assetId: 'eip155:1/slip44:60',
  address: '0x' + '11'.repeat(20),
  fiatCurrency: 'USD',
  fiatAmount: '100',
  options: { language: 'en', mode: 'dark' as const },
}
const sessionToken = 'aa'.repeat(32)
const challengeId = '00000000-0000-4000-8000-000000000000'
const makeAuth = () => ({
  signMessage: vi.fn().mockResolvedValue('0x' + '22'.repeat(65)),
  assertActive: vi.fn(),
})
function challenge(address = props.address, chainId = 1, domain = window.location.host) {
  return {
    id: challengeId,
    message: createSiweMessage({
      address: address as `0x${string}`,
      chainId,
      domain,
      scheme: window.location.protocol.slice(0, -1),
      uri: `${window.location.origin}/onramper`,
      nonce: '1234567890abcdef',
      requestId: challengeId,
      issuedAt: new Date(),
      expirationTime: new Date(Date.now() + 5 * 60_000),
      version: '1',
      statement:
        'Authorize ShapeShift Onramper checkout to this wallet. This does not authorize a blockchain transaction.',
    }),
  }
}
function responses(url = 'https://buy.onramper.com/?sigV2=test') {
  post
    .mockResolvedValueOnce({ data: challenge() })
    .mockResolvedValueOnce({
      data: {
        token: sessionToken,
        address: props.address,
        chainId: 1,
        expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      },
    })
    .mockResolvedValueOnce({ data: { id: 'intent-id', token: 'one-use-token' } })
    .mockResolvedValueOnce({ data: { url } })
}
beforeEach(() => {
  post.mockReset()
})

describe('Onramper wallet-authorized checkout', () => {
  it('verifies a wallet proof and authenticates both intent requests without sending a destination override', async () => {
    const walletAuth = makeAuth()
    responses()
    expect(await createOnRamperUrl({ ...props, walletAuth })).toContain('sigV2=test')
    expect(walletAuth.signMessage).toHaveBeenCalledWith(
      expect.stringContaining('wants you to sign in'),
      props.address,
      'eip155:1',
    )
    expect(post).toHaveBeenNthCalledWith(
      3,
      '/onramper/intents',
      expect.objectContaining({ chainId: 1, action: 'buy', fiat: 'USD', amount: '100' }),
      { headers: { Authorization: `Bearer ${sessionToken}` } },
    )
    expect(post.mock.calls[2][1]).not.toHaveProperty('address')
    expect(post).toHaveBeenNthCalledWith(
      4,
      '/onramper/intents/intent-id/checkout',
      { token: 'one-use-token' },
      { headers: { Authorization: `Bearer ${sessionToken}` } },
    )
  })
  it('preserves sell amounts', async () => {
    responses()
    await createOnRamperUrl({
      ...props,
      walletAuth: makeAuth(),
      action: FiatRampAction.Sell,
      amountCryptoPrecision: '0.02',
    })
    expect(post.mock.calls[2][1]).toMatchObject({ action: 'sell', amount: '0.02' })
  })
  it('reuses an in-memory session only for the same wallet, chain, origin and backend', async () => {
    const walletAuth = makeAuth()
    responses()
    await createOnRamperUrl({ ...props, walletAuth })
    post
      .mockClear()
      .mockResolvedValueOnce({ data: { id: 'next', token: 'token' } })
      .mockResolvedValueOnce({ data: { url: 'https://buy.onramper.com/' } })
    await createOnRamperUrl({ ...props, walletAuth })
    expect(walletAuth.signMessage).toHaveBeenCalledTimes(1)
    expect(post.mock.calls[0][0]).toBe('/onramper/intents')
  })
  it.each([
    challenge('0x' + '33'.repeat(20)),
    challenge(props.address, 10),
    challenge(props.address, 1, 'evil.example'),
  ])('refuses a challenge with the wrong wallet, network or domain', async value => {
    const walletAuth = makeAuth()
    post.mockResolvedValueOnce({ data: value })
    await expect(createOnRamperUrl({ ...props, walletAuth })).rejects.toThrow(
      'fiatRamps.onramperCheckoutFailed',
    )
    expect(walletAuth.signMessage).not.toHaveBeenCalled()
    expect(post).toHaveBeenCalledTimes(1)
  })
  it('wallet rejection does not issue an intent', async () => {
    const walletAuth = makeAuth()
    walletAuth.signMessage.mockRejectedValueOnce(new Error('Rejected'))
    post.mockResolvedValueOnce({ data: challenge() })
    await expect(createOnRamperUrl({ ...props, walletAuth })).rejects.toThrow('Rejected')
    expect(post).toHaveBeenCalledTimes(1)
  })
  it('refuses checkout when the wallet changes during authorization', async () => {
    const walletAuth = makeAuth()
    walletAuth.assertActive
      .mockImplementationOnce(() => {})
      .mockImplementationOnce(() => {
        throw new Error('Wallet changed')
      })
    responses()
    await expect(createOnRamperUrl({ ...props, walletAuth })).rejects.toThrow('Wallet changed')
    expect(post).toHaveBeenCalledTimes(1)
  })
  it('rejects non-EVM and missing-wallet flows before contacting the signer', async () => {
    await expect(createOnRamperUrl(props)).rejects.toThrow('fiatRamps.onramperWalletUnsupported')
    await expect(
      createOnRamperUrl({
        ...props,
        assetId: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
        walletAuth: makeAuth(),
      }),
    ).rejects.toThrow('fiatRamps.onramperWalletUnsupported')
    expect(post).not.toHaveBeenCalled()
  })
  it('rejects a checkout URL pointing to another origin', async () => {
    responses('https://evil.example/')
    await expect(createOnRamperUrl({ ...props, walletAuth: makeAuth() })).rejects.toThrow(
      'Invalid checkout URL',
    )
  })
  it('drops a rejected session so the next attempt requires fresh wallet verification', async () => {
    const walletAuth = makeAuth()
    responses()
    await createOnRamperUrl({ ...props, walletAuth })
    post.mockRejectedValueOnce({ response: { status: 401 } })
    await expect(createOnRamperUrl({ ...props, walletAuth })).rejects.toMatchObject({
      response: { status: 401 },
    })
    responses()
    await createOnRamperUrl({ ...props, walletAuth })
    expect(walletAuth.signMessage).toHaveBeenCalledTimes(2)
  })
})
