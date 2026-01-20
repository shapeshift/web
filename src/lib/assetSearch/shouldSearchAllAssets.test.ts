import { describe, expect, it } from 'vitest'

import { shouldSearchAllAssets } from './shouldSearchAllAssets'
import {
  ALL_ASSETS,
  PRIMARY_ASSET_IDS,
  PRIMARY_SYMBOLS,
  USDC_E_POLYGON,
  VBUSDC_KATANA,
} from './testData'

describe('shouldSearchAllAssets', () => {
  const allAssets = [...ALL_ASSETS, USDC_E_POLYGON, VBUSDC_KATANA]

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
    expect(shouldSearchAllAssets('axlusdc', allAssets, PRIMARY_ASSET_IDS, PRIMARY_SYMBOLS)).toBe(
      true,
    )
  })

  it('returns true for partial non-primary unique symbol (VB → VBUSDC)', () => {
    // "vb" could match VBUSDC which is a non-primary unique symbol
    expect(shouldSearchAllAssets('vb', allAssets, PRIMARY_ASSET_IDS, PRIMARY_SYMBOLS)).toBe(true)
  })

  it('returns true for USDC.E search (non-primary unique symbol)', () => {
    expect(shouldSearchAllAssets('usdc.e', allAssets, PRIMARY_ASSET_IDS, PRIMARY_SYMBOLS)).toBe(
      true,
    )
  })

  it('returns false for completely unrelated search', () => {
    expect(shouldSearchAllAssets('xyz', allAssets, PRIMARY_ASSET_IDS, PRIMARY_SYMBOLS)).toBe(false)
  })

  it('returns false for BTC search (LBTC is now a primary symbol)', () => {
    expect(shouldSearchAllAssets('btc', allAssets, PRIMARY_ASSET_IDS, PRIMARY_SYMBOLS)).toBe(false)
  })

  it('handles case insensitivity', () => {
    expect(shouldSearchAllAssets('AXLUSDC', allAssets, PRIMARY_ASSET_IDS, PRIMARY_SYMBOLS)).toBe(
      true,
    )
    expect(shouldSearchAllAssets('Axlusdc', allAssets, PRIMARY_ASSET_IDS, PRIMARY_SYMBOLS)).toBe(
      true,
    )
  })

  describe('name-based search', () => {
    it('returns true when search matches non-primary asset name (Axelar Bridged → AXLUSDC)', () => {
      // "Axelar Bridged" matches the name "Axelar Bridged USDC" of AXLUSDC
      // AXLUSDC has a unique symbol not in primarySymbols
      expect(
        shouldSearchAllAssets('Axelar Bridged', allAssets, PRIMARY_ASSET_IDS, PRIMARY_SYMBOLS),
      ).toBe(true)
    })

    it('returns true for partial name match (Axelar → AXLUSDC)', () => {
      expect(shouldSearchAllAssets('Axelar', allAssets, PRIMARY_ASSET_IDS, PRIMARY_SYMBOLS)).toBe(
        true,
      )
    })

    it('returns true for name containing search (Bridged → multiple bridged assets)', () => {
      expect(shouldSearchAllAssets('Bridged', allAssets, PRIMARY_ASSET_IDS, PRIMARY_SYMBOLS)).toBe(
        true,
      )
    })

    it('returns true for VaultBridge name search', () => {
      expect(
        shouldSearchAllAssets('VaultBridge', allAssets, PRIMARY_ASSET_IDS, PRIMARY_SYMBOLS),
      ).toBe(true)
    })

    it('returns true for Ethereum search (spam token has unique symbol "ETHEREUM")', () => {
      expect(shouldSearchAllAssets('Ethereum', allAssets, PRIMARY_ASSET_IDS, PRIMARY_SYMBOLS)).toBe(
        true,
      )
    })

    it('returns false for name only matching non-primary with non-unique symbol (USDC on Optimism)', () => {
      // USDC on Optimism has name "USDC" and symbol "USDC" which is in primarySymbols
      // So even though it's non-primary, its symbol isn't unique
      expect(shouldSearchAllAssets('USDC', allAssets, PRIMARY_ASSET_IDS, PRIMARY_SYMBOLS)).toBe(
        true,
      ) // Still true because USDC.E is unique
    })

    it('handles case insensitive name search', () => {
      expect(
        shouldSearchAllAssets('axelar bridged', allAssets, PRIMARY_ASSET_IDS, PRIMARY_SYMBOLS),
      ).toBe(true)
      expect(
        shouldSearchAllAssets('AXELAR BRIDGED', allAssets, PRIMARY_ASSET_IDS, PRIMARY_SYMBOLS),
      ).toBe(true)
    })

    it('returns false for Lombard name search (LBTC is now a primary symbol)', () => {
      expect(shouldSearchAllAssets('Lombard', allAssets, PRIMARY_ASSET_IDS, PRIMARY_SYMBOLS)).toBe(
        false,
      )
    })

    it('returns true for Bitcoin name search (spam token has unique symbol "BITCOIN")', () => {
      expect(shouldSearchAllAssets('Bitcoin', allAssets, PRIMARY_ASSET_IDS, PRIMARY_SYMBOLS)).toBe(
        true,
      )
    })
  })
})
