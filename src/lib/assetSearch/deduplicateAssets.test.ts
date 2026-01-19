import { describe, expect, it } from 'vitest'

import { deduplicateAssetsBySymbol } from './deduplicateAssets'

describe('deduplicateAssetsBySymbol', () => {
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
