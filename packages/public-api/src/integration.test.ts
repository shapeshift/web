import { describe, expect, it } from 'vitest'

import type { Asset, AssetsListResponse } from './routes/assets/types'
import type { ChainsListResponse } from './routes/chains/types'
import type { QuoteResponse } from './routes/quote/types'
import type { RateResponse } from './routes/rates/types'

const API_URL = process.env.API_URL ?? `http://localhost:${process.env.PORT ?? '3001'}`

const VULTISIG_PARTNER_CODE = 'vultisig'

const ASSET_IDS = {
  ETH: 'eip155:1/slip44:60',
  USDC_ETH: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  BTC: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
} as const

const TEST_PAIRS = {
  evmSameChain: {
    sellAssetId: ASSET_IDS.ETH,
    buyAssetId: ASSET_IDS.USDC_ETH,
    sellAmountCryptoBaseUnit: '100000000000000000',
  },
  crossChain: {
    sellAssetId: ASSET_IDS.ETH,
    buyAssetId: ASSET_IDS.BTC,
    sellAmountCryptoBaseUnit: '100000000000000000',
  },
}

describe('health', () => {
  it('returns ok', async () => {
    const res = await fetch(`${API_URL}/health`)
    expect(res.ok).toBe(true)
    const data = (await res.json()) as { status: string }
    expect(data.status).toBe('ok')
  })
})

describe('/v1/chains', () => {
  it('returns a non-empty list of chains', async () => {
    const res = await fetch(`${API_URL}/v1/chains`)
    expect(res.ok).toBe(true)
    const data = (await res.json()) as ChainsListResponse
    expect(Array.isArray(data.chains)).toBe(true)
    expect(data.chains.length).toBeGreaterThan(0)
    const [first] = data.chains
    expect(first).toMatchObject({ chainId: expect.any(String), name: expect.any(String) })
  })
})

describe('/v1/assets', () => {
  it('returns a non-empty list of assets', async () => {
    const res = await fetch(`${API_URL}/v1/assets?limit=10`)
    expect(res.ok).toBe(true)
    const data = (await res.json()) as AssetsListResponse
    expect(Array.isArray(data.assets)).toBe(true)
    expect(data.assets.length).toBeGreaterThan(0)
  })

  it('returns a single asset by id', async () => {
    const res = await fetch(`${API_URL}/v1/assets/${encodeURIComponent(ASSET_IDS.ETH)}`)
    expect(res.ok).toBe(true)
    const asset = (await res.json()) as Asset
    expect(asset).toMatchObject({ chainId: expect.any(String), symbol: expect.any(String) })
  })
})

describe('/v1/swap/rates', () => {
  it('does not require authentication', async () => {
    const params = new URLSearchParams({
      sellAssetId: ASSET_IDS.ETH,
      buyAssetId: ASSET_IDS.USDC_ETH,
      sellAmountCryptoBaseUnit: '100000000000000000',
    })
    const res = await fetch(`${API_URL}/v1/swap/rates?${params}`)
    expect(res.status).not.toBe(401)
  })

  it('returns rates for an EVM same-chain pair', async () => {
    const { sellAssetId, buyAssetId, sellAmountCryptoBaseUnit } = TEST_PAIRS.evmSameChain
    const params = new URLSearchParams({ sellAssetId, buyAssetId, sellAmountCryptoBaseUnit })
    const res = await fetch(`${API_URL}/v1/swap/rates?${params}`, {
      headers: { 'X-Partner-Code': VULTISIG_PARTNER_CODE },
    })
    expect(res.ok).toBe(true)
    const data = (await res.json()) as RateResponse
    expect(Array.isArray(data.rates)).toBe(true)
    const validRates = data.rates.filter(
      r => !r.error && r.buyAmountCryptoBaseUnit && r.buyAmountCryptoBaseUnit !== '0',
    )
    expect(validRates.length).toBeGreaterThan(0)
  })

  it('returns rates for a cross-chain pair', async () => {
    const { sellAssetId, buyAssetId, sellAmountCryptoBaseUnit } = TEST_PAIRS.crossChain
    const params = new URLSearchParams({ sellAssetId, buyAssetId, sellAmountCryptoBaseUnit })
    const res = await fetch(`${API_URL}/v1/swap/rates?${params}`, {
      headers: { 'X-Partner-Code': VULTISIG_PARTNER_CODE },
    })
    expect(res.ok).toBe(true)
    const data = (await res.json()) as RateResponse
    expect(Array.isArray(data.rates)).toBe(true)
    const validRates = data.rates.filter(
      r => !r.error && r.buyAmountCryptoBaseUnit && r.buyAmountCryptoBaseUnit !== '0',
    )
    expect(validRates.length).toBeGreaterThan(0)
  })

  it('uses default affiliate bps when no partner code is provided', async () => {
    const { sellAssetId, buyAssetId, sellAmountCryptoBaseUnit } = TEST_PAIRS.evmSameChain
    const params = new URLSearchParams({ sellAssetId, buyAssetId, sellAmountCryptoBaseUnit })
    const res = await fetch(`${API_URL}/v1/swap/rates?${params}`)
    expect(res.ok).toBe(true)
    const data = (await res.json()) as RateResponse
    const [first] = data.rates
    expect(first.affiliateBps).toBe('60')
  })

  it('uses resolved affiliate bps when a valid partner code is provided', async () => {
    const { sellAssetId, buyAssetId, sellAmountCryptoBaseUnit } = TEST_PAIRS.evmSameChain
    const params = new URLSearchParams({ sellAssetId, buyAssetId, sellAmountCryptoBaseUnit })
    const res = await fetch(`${API_URL}/v1/swap/rates?${params}`, {
      headers: { 'X-Partner-Code': VULTISIG_PARTNER_CODE },
    })
    expect(res.ok).toBe(true)
    const data = (await res.json()) as RateResponse
    const [first] = data.rates
    expect(typeof first.affiliateBps).toBe('string')
    expect(Number(first.affiliateBps)).toBeGreaterThan(0)
  })
})

describe('/v1/swap/quote', () => {
  it('does not require authentication', async () => {
    const res = await fetch(`${API_URL}/v1/swap/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sellAssetId: ASSET_IDS.ETH,
        buyAssetId: ASSET_IDS.USDC_ETH,
        sellAmountCryptoBaseUnit: '100000000000000000',
        receiveAddress: '0x0000000000000000000000000000000000000000',
        swapperName: '0x',
      }),
    })
    expect(res.status).not.toBe(401)
    const data = (await res.json()) as QuoteResponse
    expect(data).toMatchObject({ quoteId: expect.any(String), swapperName: expect.any(String) })
  })
})
