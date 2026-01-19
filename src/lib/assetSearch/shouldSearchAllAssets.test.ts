import { describe, expect, it } from 'vitest'

import { shouldSearchAllAssets } from './shouldSearchAllAssets'

describe('shouldSearchAllAssets', () => {
  const primaryAssets = [
    { assetId: 'usdc-mainnet', symbol: 'USDC' },
    { assetId: 'usdt-mainnet', symbol: 'USDT' },
    { assetId: 'btc-mainnet', symbol: 'BTC' },
    { assetId: 'eth-mainnet', symbol: 'ETH' },
    { assetId: 'vbusd-mainnet', symbol: 'VBUSD' },
  ]

  const allAssets = [
    ...primaryAssets,
    { assetId: 'usdc-arbitrum', symbol: 'USDC' },
    { assetId: 'usdc-optimism', symbol: 'USDC' },
    { assetId: 'axlusdc-arbitrum', symbol: 'AXLUSDC' },
    { assetId: 'axlusdc-optimism', symbol: 'AXLUSDC' },
    { assetId: 'vbusdc-ronin', symbol: 'VBUSDC' },
    { assetId: 'usdc.e-polygon', symbol: 'USDC.E' },
  ]

  const primaryAssetIds = new Set(primaryAssets.map(a => a.assetId))
  const primarySymbols = new Set(primaryAssets.map(a => a.symbol.toLowerCase()))

  it('returns true when search could match both primary and non-primary unique symbols (USD → USDC, USDC.E)', () => {
    // "usd" matches primary USDC/USDT, but also non-primary USDC.E
    // Since there's a potential non-primary unique match, we search all assets
    expect(shouldSearchAllAssets('usd', allAssets, primaryAssetIds, primarySymbols)).toBe(true)
  })

  it('returns true when search could match non-primary unique symbol (USDC → USDC.E)', () => {
    // "usdc" matches primary USDC, but also non-primary USDC.E
    // Since there's a potential non-primary unique match, we search all assets
    expect(shouldSearchAllAssets('usdc', allAssets, primaryAssetIds, primarySymbols)).toBe(true)
  })

  it('returns true for non-primary unique symbol prefix (AXLU → AXLUSDC)', () => {
    expect(shouldSearchAllAssets('axlu', allAssets, primaryAssetIds, primarySymbols)).toBe(true)
  })

  it('returns true for exact non-primary unique symbol (AXLUSDC)', () => {
    expect(shouldSearchAllAssets('axlusdc', allAssets, primaryAssetIds, primarySymbols)).toBe(true)
  })

  it('returns true for partial non-primary unique symbol (VBUSD → VBUSDC)', () => {
    // VBUSD is a primary symbol, but VBUSDC is a non-primary unique symbol
    // The search "vbusd" could match both, so we should search all assets
    expect(shouldSearchAllAssets('vbusd', allAssets, primaryAssetIds, primarySymbols)).toBe(true)
  })

  it('returns true for USDC.E search (non-primary unique symbol)', () => {
    expect(shouldSearchAllAssets('usdc.e', allAssets, primaryAssetIds, primarySymbols)).toBe(true)
  })

  it('returns false for completely unrelated search', () => {
    expect(shouldSearchAllAssets('xyz', allAssets, primaryAssetIds, primarySymbols)).toBe(false)
  })

  it('returns false for BTC search (primary symbol)', () => {
    expect(shouldSearchAllAssets('btc', allAssets, primaryAssetIds, primarySymbols)).toBe(false)
  })

  it('handles case insensitivity', () => {
    expect(shouldSearchAllAssets('AXLUSDC', allAssets, primaryAssetIds, primarySymbols)).toBe(true)
    expect(shouldSearchAllAssets('Axlusdc', allAssets, primaryAssetIds, primarySymbols)).toBe(true)
  })
})
