import { describe, expect, it } from 'vitest'

import { deduplicateAssets, deduplicateAssetsBySymbol } from './deduplicateAssets'

describe('deduplicateAssets', () => {
  it('deduplicates by relatedAssetKey, keeping primary asset', () => {
    const assets = [
      {
        assetId: 'usdc-eth',
        symbol: 'USDC',
        name: 'USD Coin',
        isPrimary: true,
        relatedAssetKey: 'usdc-eth',
      },
      {
        assetId: 'usdc-arb',
        symbol: 'USDC',
        name: 'USD Coin',
        isPrimary: false,
        relatedAssetKey: 'usdc-eth',
      },
      {
        assetId: 'usdt-eth',
        symbol: 'USDT',
        name: 'Tether',
        isPrimary: true,
        relatedAssetKey: 'usdt-eth',
      },
      {
        assetId: 'usdt-arb',
        symbol: 'USDT',
        name: 'Tether',
        isPrimary: false,
        relatedAssetKey: 'usdt-eth',
      },
    ]

    const result = deduplicateAssets(assets, 'usd')

    expect(result).toHaveLength(2)
    expect(result[0].assetId).toBe('usdc-eth')
    expect(result[1].assetId).toBe('usdt-eth')
  })

  it('keeps USDT0 out when searching "usd" (same family as USDT)', () => {
    const assets = [
      {
        assetId: 'usdc-eth',
        symbol: 'USDC',
        name: 'USD Coin',
        isPrimary: true,
        relatedAssetKey: 'usdc-eth',
      },
      {
        assetId: 'usdt0-opt',
        symbol: 'USDT0',
        name: 'USDT0',
        isPrimary: false,
        relatedAssetKey: 'usdt-eth',
      },
      {
        assetId: 'usdt-eth',
        symbol: 'USDT',
        name: 'Tether',
        isPrimary: true,
        relatedAssetKey: 'usdt-eth',
      },
    ]

    const result = deduplicateAssets(assets, 'usd')

    expect(result).toHaveLength(2)
    expect(result.map(a => a.symbol)).toEqual(['USDC', 'USDT'])
    expect(result.find(a => a.symbol === 'USDT0')).toBeUndefined()
  })

  it('shows USDT0 when searching "usdt0" (exact match)', () => {
    const assets = [
      {
        assetId: 'usdt0-opt',
        symbol: 'USDT0',
        name: 'USDT0',
        isPrimary: false,
        relatedAssetKey: 'usdt-eth',
      },
      {
        assetId: 'usdt0-poly',
        symbol: 'USDT0',
        name: 'USDT0',
        isPrimary: false,
        relatedAssetKey: 'usdt-eth',
      },
      {
        assetId: 'usdt-eth',
        symbol: 'USDT',
        name: 'Tether',
        isPrimary: true,
        relatedAssetKey: 'usdt-eth',
      },
    ]

    const result = deduplicateAssets(assets, 'usdt0')

    expect(result).toHaveLength(1)
    expect(result[0].symbol).toBe('USDT0')
  })

  it('shows AXLUSDC when searching "axlusdc" (exact match for non-primary)', () => {
    const assets = [
      {
        assetId: 'usdc-eth',
        symbol: 'USDC',
        name: 'USD Coin',
        isPrimary: true,
        relatedAssetKey: 'usdc-eth',
      },
      {
        assetId: 'axlusdc-arb',
        symbol: 'AXLUSDC',
        name: 'Axelar USDC',
        isPrimary: false,
        relatedAssetKey: 'usdc-eth',
      },
    ]

    const result = deduplicateAssets(assets, 'axlusdc')

    expect(result).toHaveLength(1)
    expect(result[0].symbol).toBe('AXLUSDC')
  })

  it('shows primary USDT when searching "usdt" (exact match for primary)', () => {
    const assets = [
      {
        assetId: 'usdt-eth',
        symbol: 'USDT',
        name: 'Tether',
        isPrimary: true,
        relatedAssetKey: 'usdt-eth',
      },
      {
        assetId: 'usdt0-opt',
        symbol: 'USDT0',
        name: 'USDT0',
        isPrimary: false,
        relatedAssetKey: 'usdt-eth',
      },
    ]

    const result = deduplicateAssets(assets, 'usdt')

    expect(result).toHaveLength(1)
    expect(result[0].symbol).toBe('USDT')
  })

  it('handles chain-specific assets (null relatedAssetKey) by using assetId', () => {
    const assets = [
      { assetId: 'eth', symbol: 'ETH', name: 'Ethereum', isPrimary: true, relatedAssetKey: null },
      { assetId: 'btc', symbol: 'BTC', name: 'Bitcoin', isPrimary: true, relatedAssetKey: null },
    ]

    const result = deduplicateAssets(assets, 'e')

    expect(result).toHaveLength(2)
  })

  it('handles undefined relatedAssetKey by using assetId', () => {
    const assets = [
      { assetId: 'eth', symbol: 'ETH', name: 'Ethereum', isPrimary: true },
      { assetId: 'btc', symbol: 'BTC', name: 'Bitcoin', isPrimary: true },
    ]

    const result = deduplicateAssets(assets, 'e')

    expect(result).toHaveLength(2)
  })

  it('returns empty array for empty input', () => {
    const result = deduplicateAssets([], 'usd')
    expect(result).toEqual([])
  })

  it('handles no search string by preferring primary assets', () => {
    const assets = [
      {
        assetId: 'usdc-arb',
        symbol: 'USDC',
        name: 'USD Coin',
        isPrimary: false,
        relatedAssetKey: 'usdc-eth',
      },
      {
        assetId: 'usdc-eth',
        symbol: 'USDC',
        name: 'USD Coin',
        isPrimary: true,
        relatedAssetKey: 'usdc-eth',
      },
    ]

    const result = deduplicateAssets(assets)

    expect(result).toHaveLength(1)
    expect(result[0].isPrimary).toBe(true)
  })
})

describe('deduplicateAssetsBySymbol (deprecated)', () => {
  it('keeps first occurrence of each symbol', () => {
    const assets = [
      { symbol: 'USDC', name: 'USDC Mainnet', chainId: 'mainnet' },
      { symbol: 'USDC', name: 'USDC Arbitrum', chainId: 'arbitrum' },
      { symbol: 'USDC', name: 'USDC Optimism', chainId: 'optimism' },
    ]

    const result = deduplicateAssetsBySymbol(assets)

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('USDC Mainnet')
  })

  it('handles multiple different symbols', () => {
    const assets = [
      { symbol: 'AXLUSDC', name: 'AXLUSDC Arbitrum' },
      { symbol: 'AXLUSDC', name: 'AXLUSDC Optimism' },
      { symbol: 'AXLUSDT', name: 'AXLUSDT Arbitrum' },
      { symbol: 'AXLUSDT', name: 'AXLUSDT Optimism' },
      { symbol: 'VBUSDC', name: 'VBUSDC Ronin' },
    ]

    const result = deduplicateAssetsBySymbol(assets)

    expect(result).toHaveLength(3)
    expect(result.map(a => a.symbol)).toEqual(['AXLUSDC', 'AXLUSDT', 'VBUSDC'])
    expect(result[0].name).toBe('AXLUSDC Arbitrum')
    expect(result[1].name).toBe('AXLUSDT Arbitrum')
  })

  it('is case insensitive', () => {
    const assets = [
      { symbol: 'USDC', name: 'USDC Mainnet' },
      { symbol: 'usdc', name: 'usdc lowercase' },
      { symbol: 'Usdc', name: 'Usdc Mixed' },
    ]

    const result = deduplicateAssetsBySymbol(assets)

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('USDC Mainnet')
  })

  it('returns empty array for empty input', () => {
    const result = deduplicateAssetsBySymbol([])
    expect(result).toEqual([])
  })

  it('returns single item unchanged', () => {
    const assets = [{ symbol: 'BTC', name: 'Bitcoin' }]
    const result = deduplicateAssetsBySymbol(assets)
    expect(result).toEqual(assets)
  })

  it('preserves order of first occurrences', () => {
    const assets = [
      { symbol: 'ETH', name: 'ETH 1' },
      { symbol: 'BTC', name: 'BTC 1' },
      { symbol: 'ETH', name: 'ETH 2' },
      { symbol: 'USDC', name: 'USDC 1' },
      { symbol: 'BTC', name: 'BTC 2' },
    ]

    const result = deduplicateAssetsBySymbol(assets)

    expect(result.map(a => a.symbol)).toEqual(['ETH', 'BTC', 'USDC'])
    expect(result.map(a => a.name)).toEqual(['ETH 1', 'BTC 1', 'USDC 1'])
  })

  it('prefers primary assets over non-primary when same symbol', () => {
    const assets = [
      { symbol: 'USDT', name: 'USDT Arbitrum', isPrimary: false },
      { symbol: 'USDT', name: 'Tether', isPrimary: true },
      { symbol: 'USDT', name: 'USDT Optimism', isPrimary: false },
    ]

    const result = deduplicateAssetsBySymbol(assets)

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Tether')
    expect(result[0].isPrimary).toBe(true)
  })

  it('keeps first occurrence if no primary asset exists', () => {
    const assets = [
      { symbol: 'AXLUSDC', name: 'AXLUSDC Arbitrum', isPrimary: false },
      { symbol: 'AXLUSDC', name: 'AXLUSDC Optimism', isPrimary: false },
    ]

    const result = deduplicateAssetsBySymbol(assets)

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('AXLUSDC Arbitrum')
  })

  it('handles mixed primary and non-primary with multiple symbols', () => {
    const assets = [
      { symbol: 'USDC', name: 'USDC Arbitrum', isPrimary: false },
      { symbol: 'USDT', name: 'USDT Arbitrum', isPrimary: false },
      { symbol: 'USDC', name: 'Circle USDC', isPrimary: true },
      { symbol: 'USDT', name: 'Tether', isPrimary: true },
    ]

    const result = deduplicateAssetsBySymbol(assets)

    expect(result).toHaveLength(2)
    expect(result.find(a => a.symbol === 'USDC')?.name).toBe('Circle USDC')
    expect(result.find(a => a.symbol === 'USDT')?.name).toBe('Tether')
  })
})
