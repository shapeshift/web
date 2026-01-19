import { describe, expect, it } from 'vitest'

import { deduplicateAssets, deduplicateAssetsBySymbol } from './deduplicateAssets'
import {
  AXLUSDC_ARBITRUM,
  AXLUSDC_OPTIMISM,
  BTC_MAINNET,
  ETH_MAINNET,
  USDC_ARBITRUM,
  USDC_ETH_PRIMARY,
  USDC_OPTIMISM,
  USDT_ETH_PRIMARY,
  USDT_OPTIMISM,
  USDT0_OPTIMISM,
  USDT0_POLYGON,
} from './testData'

describe('deduplicateAssets', () => {
  it('deduplicates by relatedAssetKey, keeping primary asset', () => {
    const assets = [USDC_ETH_PRIMARY, USDC_ARBITRUM, USDT_ETH_PRIMARY, USDT_OPTIMISM]

    const result = deduplicateAssets(assets, 'usd')

    expect(result).toHaveLength(2)
    expect(result[0].assetId).toBe(USDC_ETH_PRIMARY.assetId)
    expect(result[1].assetId).toBe(USDT_ETH_PRIMARY.assetId)
  })

  it('keeps USDT0 out when searching "usd" (same family as USDT)', () => {
    const assets = [USDC_ETH_PRIMARY, USDT0_OPTIMISM, USDT_ETH_PRIMARY]

    const result = deduplicateAssets(assets, 'usd')

    expect(result).toHaveLength(2)
    expect(result.map(a => a.symbol)).toEqual(['USDC', 'USDT'])
    expect(result.find(a => a.symbol === 'USDT0')).toBeUndefined()
  })

  it('shows USDT0 when only USDT0 variants exist (no primary)', () => {
    const assets = [USDT0_OPTIMISM, USDT0_POLYGON]

    const result = deduplicateAssets(assets, 'usdt0')

    expect(result).toHaveLength(1)
    expect(result[0].symbol).toBe('USDT0')
  })

  it('shows primary USDT when searching "usdt0" but primary USDT exists (same family)', () => {
    const assets = [USDT0_OPTIMISM, USDT_ETH_PRIMARY]

    const result = deduplicateAssets(assets, 'usdt0')

    expect(result).toHaveLength(1)
    expect(result[0].symbol).toBe('USDT')
    expect(result[0].isPrimary).toBe(true)
  })

  it('shows primary USDC when AXLUSDC is in USDC family (primary always wins)', () => {
    const assets = [USDC_ETH_PRIMARY, AXLUSDC_ARBITRUM]

    const result = deduplicateAssets(assets, 'axlusdc')

    expect(result).toHaveLength(1)
    expect(result[0].symbol).toBe('USDC')
    expect(result[0].isPrimary).toBe(true)
  })

  it('shows AXLUSDC when it has its own family (separate from USDC)', () => {
    // Create AXLUSDC assets with their own family key
    const axlusdcFamily = 'eip155:1/erc20:axlusdc-family'
    const assets = [
      { ...AXLUSDC_ARBITRUM, relatedAssetKey: axlusdcFamily, isPrimary: false },
      { ...AXLUSDC_OPTIMISM, relatedAssetKey: axlusdcFamily, isPrimary: true },
    ]

    const result = deduplicateAssets(assets, 'axlusdc')

    expect(result).toHaveLength(1)
    expect(result[0].symbol).toBe('AXLUSDC')
    expect(result[0].isPrimary).toBe(true)
  })

  it('prefers primary AXLUSDC over non-primary when both have exact match', () => {
    // Create AXLUSDC assets with their own family and a primary
    const axlusdcFamily = 'eip155:1/erc20:axlusdc-family'
    const axlusdcPrimary = {
      ...AXLUSDC_OPTIMISM,
      assetId: 'eip155:1/erc20:axlusdc-primary' as const,
      relatedAssetKey: axlusdcFamily,
      isPrimary: true,
    }
    const assets = [
      { ...AXLUSDC_OPTIMISM, relatedAssetKey: axlusdcFamily, isPrimary: false },
      { ...AXLUSDC_ARBITRUM, relatedAssetKey: axlusdcFamily, isPrimary: false },
      axlusdcPrimary,
    ]

    const result = deduplicateAssets(assets, 'axlusdc')

    expect(result).toHaveLength(1)
    expect(result[0].assetId).toBe(axlusdcPrimary.assetId)
    expect(result[0].isPrimary).toBe(true)
  })

  it('returns primary even when non-primary exact match comes first in array', () => {
    // Create AXLUSDC assets with primary coming second in array
    const axlusdcFamily = 'eip155:1/erc20:axlusdc-family'
    const axlusdcPrimary = {
      ...AXLUSDC_OPTIMISM,
      assetId: 'eip155:1/erc20:axlusdc-primary' as const,
      relatedAssetKey: axlusdcFamily,
      isPrimary: true,
    }
    const assets = [
      { ...AXLUSDC_OPTIMISM, relatedAssetKey: axlusdcFamily, isPrimary: false },
      axlusdcPrimary,
    ]

    const result = deduplicateAssets(assets, 'axlusdc')

    expect(result).toHaveLength(1)
    expect(result[0].isPrimary).toBe(true)
    expect(result[0].assetId).toBe(axlusdcPrimary.assetId)
  })

  it('shows both AXLUSDC and AXLUSDT groups when searching "axlusd"', () => {
    // Create separate families for AXLUSDC and AXLUSDT
    const axlusdcFamily = 'eip155:1/erc20:axlusdc-family'
    const axlusdtFamily = 'eip155:1/erc20:axlusdt-family'
    const assets = [
      { ...AXLUSDC_OPTIMISM, relatedAssetKey: axlusdcFamily, isPrimary: false },
      { ...AXLUSDC_OPTIMISM, assetId: 'eip155:1/erc20:axlusdc-primary' as const, relatedAssetKey: axlusdcFamily, isPrimary: true },
      { ...AXLUSDC_ARBITRUM, symbol: 'AXLUSDT', name: 'Axelar USDT', relatedAssetKey: axlusdtFamily, isPrimary: false },
      { ...AXLUSDC_ARBITRUM, assetId: 'eip155:1/erc20:axlusdt-primary' as const, symbol: 'AXLUSDT', name: 'Axelar USDT', relatedAssetKey: axlusdtFamily, isPrimary: true },
    ]

    const result = deduplicateAssets(assets, 'axlusd')

    expect(result).toHaveLength(2)
    expect(result.map(a => a.symbol)).toEqual(['AXLUSDC', 'AXLUSDT'])
    expect(result.every(a => a.isPrimary)).toBe(true)
  })

  it('shows primary USDT when searching "usdt" (exact match for primary)', () => {
    const assets = [USDT_ETH_PRIMARY, USDT0_OPTIMISM]

    const result = deduplicateAssets(assets, 'usdt')

    expect(result).toHaveLength(1)
    expect(result[0].symbol).toBe('USDT')
  })

  it('handles chain-specific assets (null relatedAssetKey) by using assetId', () => {
    const assets = [ETH_MAINNET, BTC_MAINNET]

    const result = deduplicateAssets(assets, 'e')

    // ETH matches 'e', BTC matches via name 'Bitcoin' containing 'e'
    expect(result).toHaveLength(2)
  })

  it('handles undefined relatedAssetKey by using assetId', () => {
    const assets = [
      { ...ETH_MAINNET, relatedAssetKey: undefined },
      { ...BTC_MAINNET, relatedAssetKey: undefined },
    ]

    const result = deduplicateAssets(assets, 'e')

    expect(result).toHaveLength(2)
  })

  it('returns empty array for empty input', () => {
    const result = deduplicateAssets([], 'usd')
    expect(result).toEqual([])
  })

  it('handles no search string by preferring primary assets', () => {
    const assets = [USDC_ARBITRUM, USDC_ETH_PRIMARY]

    const result = deduplicateAssets(assets)

    expect(result).toHaveLength(1)
    expect(result[0].isPrimary).toBe(true)
  })
})

describe('deduplicateAssetsBySymbol (deprecated)', () => {
  it('keeps first occurrence of each symbol', () => {
    const assets = [USDC_ETH_PRIMARY, USDC_ARBITRUM, USDC_OPTIMISM]

    const result = deduplicateAssetsBySymbol(assets)

    expect(result).toHaveLength(1)
    expect(result[0].assetId).toBe(USDC_ETH_PRIMARY.assetId)
  })

  it('handles multiple different symbols', () => {
    const assets = [
      AXLUSDC_ARBITRUM,
      AXLUSDC_OPTIMISM,
      { ...AXLUSDC_ARBITRUM, symbol: 'AXLUSDT', name: 'Axelar USDT' },
      { ...AXLUSDC_OPTIMISM, symbol: 'AXLUSDT', name: 'Axelar USDT' },
      { ...AXLUSDC_OPTIMISM, symbol: 'VBUSDC', name: 'VBUSDC Ronin' },
    ]

    const result = deduplicateAssetsBySymbol(assets)

    expect(result).toHaveLength(3)
    expect(result.map(a => a.symbol)).toEqual(['AXLUSDC', 'AXLUSDT', 'VBUSDC'])
  })

  it('is case insensitive', () => {
    const assets = [
      USDC_ETH_PRIMARY,
      { ...USDC_ARBITRUM, symbol: 'usdc' },
      { ...USDC_OPTIMISM, symbol: 'Usdc' },
    ]

    const result = deduplicateAssetsBySymbol(assets)

    expect(result).toHaveLength(1)
    expect(result[0].assetId).toBe(USDC_ETH_PRIMARY.assetId)
  })

  it('returns empty array for empty input', () => {
    const result = deduplicateAssetsBySymbol([])
    expect(result).toEqual([])
  })

  it('returns single item unchanged', () => {
    const assets = [BTC_MAINNET]
    const result = deduplicateAssetsBySymbol(assets)
    expect(result).toEqual(assets)
  })

  it('preserves order of first occurrences', () => {
    const assets = [
      ETH_MAINNET,
      BTC_MAINNET,
      { ...ETH_MAINNET, assetId: 'eip155:10/slip44:60' as const },
      USDC_ETH_PRIMARY,
      { ...BTC_MAINNET, assetId: 'bip122:btc2' as const },
    ]

    const result = deduplicateAssetsBySymbol(assets)

    expect(result.map(a => a.symbol)).toEqual(['ETH', 'BTC', 'USDC'])
  })

  it('prefers primary assets over non-primary when same symbol', () => {
    const assets = [USDT_OPTIMISM, USDT_ETH_PRIMARY, { ...USDT_OPTIMISM, assetId: 'eip155:42161/usdt' as const }]

    const result = deduplicateAssetsBySymbol(assets)

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Tether')
    expect(result[0].isPrimary).toBe(true)
  })

  it('keeps first occurrence if no primary asset exists', () => {
    const assets = [AXLUSDC_ARBITRUM, AXLUSDC_OPTIMISM]

    const result = deduplicateAssetsBySymbol(assets)

    expect(result).toHaveLength(1)
    expect(result[0].assetId).toBe(AXLUSDC_ARBITRUM.assetId)
  })

  it('handles mixed primary and non-primary with multiple symbols', () => {
    const assets = [USDC_ARBITRUM, USDT_OPTIMISM, USDC_ETH_PRIMARY, USDT_ETH_PRIMARY]

    const result = deduplicateAssetsBySymbol(assets)

    expect(result).toHaveLength(2)
    expect(result.find(a => a.symbol === 'USDC')?.assetId).toBe(USDC_ETH_PRIMARY.assetId)
    expect(result.find(a => a.symbol === 'USDT')?.assetId).toBe(USDT_ETH_PRIMARY.assetId)
  })
})
