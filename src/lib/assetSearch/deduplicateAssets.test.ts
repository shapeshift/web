import { describe, expect, it } from 'vitest'

import { deduplicateAssets } from './deduplicateAssets'
import {
  AXLUSDC_ARBITRUM,
  AXLUSDC_OPTIMISM,
  AXLUSDT_ARBITRUM,
  AXLUSDT_OPTIMISM,
  BRIDGED_USDT_OPTIMISM,
  BTC_MAINNET,
  ETH_MAINNET,
  LBTC_BASE_PRIMARY,
  LBTC_ETH,
  USDC_ARBITRUM,
  USDC_ETH_PRIMARY,
  USDT_ETH_PRIMARY,
  USDT_OPTIMISM,
  USDT0_OPTIMISM,
  USDT0_POLYGON,
  VBUSDC_KATANA,
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
      {
        ...AXLUSDC_OPTIMISM,
        assetId: 'eip155:1/erc20:axlusdc-primary' as const,
        relatedAssetKey: axlusdcFamily,
        isPrimary: true,
      },
      {
        ...AXLUSDC_ARBITRUM,
        symbol: 'AXLUSDT',
        name: 'Axelar USDT',
        relatedAssetKey: axlusdtFamily,
        isPrimary: false,
      },
      {
        ...AXLUSDC_ARBITRUM,
        assetId: 'eip155:1/erc20:axlusdt-primary' as const,
        symbol: 'AXLUSDT',
        name: 'Axelar USDT',
        relatedAssetKey: axlusdtFamily,
        isPrimary: true,
      },
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

  describe('name search grouping', () => {
    it('groups "Axelar Bridged" name search results by family', () => {
      // AXLUSDC and AXLUSDT are in different families (USDC and USDT families)
      const assets = [AXLUSDC_OPTIMISM, AXLUSDC_ARBITRUM, AXLUSDT_OPTIMISM, AXLUSDT_ARBITRUM]

      const result = deduplicateAssets(assets, 'Axelar Bridged')

      // Should show one from each family
      expect(result).toHaveLength(2)
      expect(result.map(a => a.symbol).sort()).toEqual(['AXLUSDC', 'AXLUSDT'])
    })

    it('returns primary USDC when searching "Axelar Bridged USDC" (AXLUSDC is in USDC family)', () => {
      const assets = [USDC_ETH_PRIMARY, AXLUSDC_OPTIMISM, AXLUSDC_ARBITRUM]

      const result = deduplicateAssets(assets, 'Axelar Bridged USDC')

      // AXLUSDC is in USDC family, so primary USDC wins
      expect(result).toHaveLength(1)
      expect(result[0].symbol).toBe('USDC')
      expect(result[0].isPrimary).toBe(true)
    })

    it('returns primary USDT when searching "Axelar Bridged USDT" (AXLUSDT is in USDT family)', () => {
      const assets = [USDT_ETH_PRIMARY, AXLUSDT_OPTIMISM, AXLUSDT_ARBITRUM]

      const result = deduplicateAssets(assets, 'Axelar Bridged USDT')

      // AXLUSDT is in USDT family, so primary USDT wins
      expect(result).toHaveLength(1)
      expect(result[0].symbol).toBe('USDT')
      expect(result[0].isPrimary).toBe(true)
    })

    it('groups "Lombard" name search results', () => {
      const assets = [LBTC_BASE_PRIMARY, LBTC_ETH]

      const result = deduplicateAssets(assets, 'Lombard')

      // Both are in the same family, should return primary
      expect(result).toHaveLength(1)
      expect(result[0].isPrimary).toBe(true)
    })

    it('groups "Lombard Staked BTC" exact name search', () => {
      const assets = [LBTC_ETH, LBTC_BASE_PRIMARY]

      const result = deduplicateAssets(assets, 'Lombard Staked BTC')

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Lombard Staked BTC')
      expect(result[0].isPrimary).toBe(true)
    })

    it('returns primary USDC when searching "VaultBridge Bridged USDC" (VBUSDC is in USDC family)', () => {
      const assets = [USDC_ETH_PRIMARY, VBUSDC_KATANA]

      const result = deduplicateAssets(assets, 'VaultBridge Bridged USDC')

      // VBUSDC is in USDC family
      expect(result).toHaveLength(1)
      expect(result[0].symbol).toBe('USDC')
      expect(result[0].isPrimary).toBe(true)
    })

    it('shows VBUSDC when no primary USDC in results', () => {
      const assets = [VBUSDC_KATANA]

      const result = deduplicateAssets(assets, 'VaultBridge')

      expect(result).toHaveLength(1)
      expect(result[0].symbol).toBe('VBUSDC')
    })

    it('returns primary USDT when searching "Bridged USDT" (in USDT family)', () => {
      const assets = [USDT_ETH_PRIMARY, BRIDGED_USDT_OPTIMISM]

      const result = deduplicateAssets(assets, 'Bridged USDT')

      expect(result).toHaveLength(1)
      expect(result[0].symbol).toBe('USDT')
      expect(result[0].isPrimary).toBe(true)
    })

    it('groups all "Bridged" assets by their families', () => {
      const assets = [
        USDC_ETH_PRIMARY,
        USDT_ETH_PRIMARY,
        AXLUSDC_OPTIMISM,
        AXLUSDT_OPTIMISM,
        VBUSDC_KATANA,
        BRIDGED_USDT_OPTIMISM,
      ]

      const result = deduplicateAssets(assets, 'Bridged')

      // All bridged assets are in USDC or USDT families, primaries win
      expect(result).toHaveLength(2)
      expect(result.map(a => a.symbol).sort()).toEqual(['USDC', 'USDT'])
      expect(result.every(a => a.isPrimary)).toBe(true)
    })

    it('handles "Bitcoin" exact name search (single asset, no grouping needed)', () => {
      // Note: deduplicateAssets receives pre-filtered search results
      // BTC_MAINNET has null relatedAssetKey, so it groups by assetId
      const assets = [BTC_MAINNET]

      const result = deduplicateAssets(assets, 'Bitcoin')

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Bitcoin')
    })
  })
})
