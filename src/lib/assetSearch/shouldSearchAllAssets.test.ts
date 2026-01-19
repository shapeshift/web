import { describe, expect, it } from 'vitest'

import { shouldSearchAllAssets } from './shouldSearchAllAssets'
import { ALL_ASSETS, PRIMARY_ASSET_IDS, PRIMARY_SYMBOLS } from './testData'

describe('shouldSearchAllAssets', () => {
  // Add a USDC.E and VBUSDC for specific test cases
  const USDC_E_POLYGON = {
    assetId: 'eip155:137/erc20:0x2791bca1f2de4661ed88a30c99a7a9449aa84174' as const,
    symbol: 'USDC.E',
    name: 'USD Coin (PoS)',
    chainId: 'eip155:137' as const,
    relatedAssetKey: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as const,
    isPrimary: false,
  }

  const VBUSDC_RONIN = {
    assetId: 'eip155:747474/erc20:0x203a662b0bd271a6ed5a60edfbd04bfce608fd36' as const,
    symbol: 'VBUSDC',
    name: 'VaultBridge Bridged USDC',
    chainId: 'eip155:747474' as const,
    relatedAssetKey: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as const,
    isPrimary: false,
  }

  const allAssets = [...ALL_ASSETS, USDC_E_POLYGON, VBUSDC_RONIN]

  it('returns true when search could match both primary and non-primary unique symbols (USD → USDC, USDC.E)', () => {
    // "usd" matches primary USDC/USDT, but also non-primary USDC.E
    // Since there's a potential non-primary unique match, we search all assets
    expect(shouldSearchAllAssets('usd', allAssets, PRIMARY_ASSET_IDS, PRIMARY_SYMBOLS)).toBe(true)
  })

  it('returns true when search could match non-primary unique symbol (USDC → USDC.E)', () => {
    // "usdc" matches primary USDC, but also non-primary USDC.E
    // Since there's a potential non-primary unique match, we search all assets
    expect(shouldSearchAllAssets('usdc', allAssets, PRIMARY_ASSET_IDS, PRIMARY_SYMBOLS)).toBe(true)
  })

  it('returns true for non-primary unique symbol prefix (AXLU → AXLUSDC)', () => {
    expect(shouldSearchAllAssets('axlu', allAssets, PRIMARY_ASSET_IDS, PRIMARY_SYMBOLS)).toBe(true)
  })

  it('returns true for exact non-primary unique symbol (AXLUSDC)', () => {
    expect(shouldSearchAllAssets('axlusdc', allAssets, PRIMARY_ASSET_IDS, PRIMARY_SYMBOLS)).toBe(true)
  })

  it('returns true for partial non-primary unique symbol (VB → VBUSDC)', () => {
    // "vb" could match VBUSDC which is a non-primary unique symbol
    expect(shouldSearchAllAssets('vb', allAssets, PRIMARY_ASSET_IDS, PRIMARY_SYMBOLS)).toBe(true)
  })

  it('returns true for USDC.E search (non-primary unique symbol)', () => {
    expect(shouldSearchAllAssets('usdc.e', allAssets, PRIMARY_ASSET_IDS, PRIMARY_SYMBOLS)).toBe(true)
  })

  it('returns false for completely unrelated search', () => {
    expect(shouldSearchAllAssets('xyz', allAssets, PRIMARY_ASSET_IDS, PRIMARY_SYMBOLS)).toBe(false)
  })

  it('returns false for BTC search (primary symbol, no non-primary unique matches)', () => {
    expect(shouldSearchAllAssets('btc', allAssets, PRIMARY_ASSET_IDS, PRIMARY_SYMBOLS)).toBe(false)
  })

  it('handles case insensitivity', () => {
    expect(shouldSearchAllAssets('AXLUSDC', allAssets, PRIMARY_ASSET_IDS, PRIMARY_SYMBOLS)).toBe(true)
    expect(shouldSearchAllAssets('Axlusdc', allAssets, PRIMARY_ASSET_IDS, PRIMARY_SYMBOLS)).toBe(true)
  })
})
