import { describe, expect, it, vi } from 'vitest'

import { FiatRampAction } from '../../FiatRampsCommon'
import { createOnRamperUrl } from './index'

const { post, config } = vi.hoisted(() => ({
  post: vi.fn(),
  config: {
    VITE_ONRAMPER_SIGNING_URL: 'https://checkout.example',
    VITE_ONRAMPER_WIDGET_URL: 'https://buy.onramper.com/',
  },
}))
vi.mock('axios', () => ({ default: { create: () => ({ post }) } }))
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

describe('Onramper server checkout', () => {
  it('redeems a scoped checkout intent without receiving a signing key', async () => {
    post
      .mockResolvedValueOnce({ data: { id: 'intent-id', token: 'one-use-token' } })
      .mockResolvedValueOnce({ data: { url: 'https://buy.onramper.com/?sigV2=test' } })
    expect(await createOnRamperUrl(props)).toContain('sigV2=test')
    expect(post).toHaveBeenNthCalledWith(
      1,
      '/onramper/intents',
      expect.objectContaining({
        action: 'buy',
        fiat: 'USD',
        amount: '100',
        address: props.address,
      }),
    )
    expect(post).toHaveBeenNthCalledWith(2, '/onramper/intents/intent-id/checkout', {
      token: 'one-use-token',
    })
  })
  it('preserves sell amounts', async () => {
    post
      .mockClear()
      .mockResolvedValueOnce({ data: { id: 'intent', token: 'token' } })
      .mockResolvedValueOnce({ data: { url: 'https://buy.onramper.com/' } })
    await createOnRamperUrl({
      ...props,
      action: FiatRampAction.Sell,
      amountCryptoPrecision: '0.02',
    })
    expect(post).toHaveBeenNthCalledWith(
      1,
      '/onramper/intents',
      expect.objectContaining({ action: 'sell', amount: '0.02' }),
    )
  })
  it('rejects a checkout response pointing to a different site', async () => {
    post
      .mockResolvedValueOnce({ data: { id: 'intent', token: 'token' } })
      .mockResolvedValueOnce({ data: { url: 'https://evil.example/' } })
    await expect(createOnRamperUrl(props)).rejects.toThrow('Invalid checkout URL')
  })
})
