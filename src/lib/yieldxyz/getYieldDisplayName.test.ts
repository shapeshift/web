import { describe, expect, it } from 'vitest'

import { getYieldDisplayName } from './getYieldDisplayName'
import type { AugmentedYieldDto } from './types'

const mockYield = (providerId: string, tokenSymbol: string, metadataName: string) =>
  ({
    providerId,
    token: { symbol: tokenSymbol },
    metadata: { name: metadataName },
  }) as AugmentedYieldDto

describe('getYieldDisplayName', () => {
  describe('returns token symbol for standard yields', () => {
    it.each([
      ['aave', 'USDC', 'Aave v3 Lending'],
      ['fluid', 'USDT', '(PoS) Tether USD Lending Fluid Vault'],
      ['compound', 'WETH', 'Compound v3 Lending'],
      ['lido', 'stETH', 'Lido Ethereum Staking'],
      ['gearbox', 'USDC', 'USDC Trade USDC v3 Gearbox Vault'],
    ])('%s %s → %s', (providerId, symbol, metadataName) => {
      expect(getYieldDisplayName(mockYield(providerId, symbol, metadataName))).toBe(symbol)
    })
  })

  describe('returns curator name for Morpho/Yearn vaults with known curators', () => {
    it.each([
      ['morpho', 'Steakhouse High Yield USDC Morpho Vault', 'Steakhouse High Yield'],
      ['morpho', 'Steakhouse Prime USDC Morpho Vault', 'Steakhouse Prime'],
      ['morpho', 'Gauntlet USDT Vault Morpho Vault', 'Gauntlet'],
      ['morpho', 'Clearstar USDC Reactor Morpho Vault', 'Clearstar'],
      ['morpho', 'Yearn OG USDT Morpho Vault', 'Yearn OG'],
      ['yearn', 'Yearn OG vbETH Compounder Yearn Vault V3', 'Yearn OG'],
    ])('%s "%s" → %s', (providerId, metadataName, expected) => {
      expect(getYieldDisplayName(mockYield(providerId, 'TOKEN', metadataName))).toBe(expected)
    })
  })

  describe('returns symbol when vault has no matching curator prefix', () => {
    it.each([
      ['yearn', 'vbUSDT', 'Morpho Yearn OG USDT Compounder Yearn Vault V3'],
      ['yearn', 'AUSD', 'AUSD yVault Yearn Vault V3'],
    ])('%s %s → %s (no curator prefix)', (providerId, symbol, metadataName) => {
      expect(getYieldDisplayName(mockYield(providerId, symbol, metadataName))).toBe(symbol)
    })
  })
})
