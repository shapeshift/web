import { solanaChainId } from '@shapeshiftoss/caip'
import { describe, expect, it, vi } from 'vitest'

import { augmentYield } from './augment'
import type { YieldDto } from './types'
import { YieldNetwork } from './types'

vi.mock('@/context/PluginProvider/chainAdapterSingleton', () => ({
  getChainAdapterManager: () => ({
    get: (chainId: string) => {
      if (chainId === solanaChainId) {
        return {
          getFeeAssetId: () => 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
        }
      }
      return undefined
    },
  }),
}))

const createMockYieldDto = (overrides: Partial<YieldDto> = {}): YieldDto =>
  ({
    id: 'test-yield-id',
    network: YieldNetwork.Solana,
    chainId: '',
    token: {
      name: 'Test Token',
      symbol: 'TEST',
      decimals: 6,
      network: YieldNetwork.Solana,
      address: 'TestTokenAddress123',
      logoURI: 'https://example.com/token.png',
    },
    inputTokens: [
      {
        name: 'Input Token',
        symbol: 'INPUT',
        decimals: 6,
        network: YieldNetwork.Solana,
        address: 'InputTokenAddress123',
        logoURI: 'https://example.com/input.png',
      },
    ],
    outputToken: undefined,
    status: { enter: true, exit: true },
    rewardRate: {
      total: 0.05,
      rateType: 'APY',
      components: [],
    },
    metadata: {
      name: 'Test Yield',
      logoURI: 'https://example.com/yield.png',
      description: 'A test yield',
      underMaintenance: false,
      deprecated: false,
    },
    statistics: {
      tvlUsd: '1000000',
    },
    mechanics: {
      type: 'lending',
      requiresValidatorSelection: false,
      gasFeeToken: {
        name: 'Solana',
        symbol: 'SOL',
        decimals: 9,
        network: YieldNetwork.Solana,
        logoURI: 'https://example.com/sol.png',
      },
      arguments: {
        enter: { fields: [] },
        exit: { fields: [] },
      },
      entryLimits: { minimum: '0' },
      exitLimits: { minimum: '0' },
    },
    providerId: 'test-provider',
    ...overrides,
  }) as YieldDto

describe('augmentYield', () => {
  describe('inputTokens handling', () => {
    it('should augment inputTokens when array is provided', () => {
      const yieldDto = createMockYieldDto({
        inputTokens: [
          {
            name: 'Input Token',
            symbol: 'INPUT',
            decimals: 6,
            network: YieldNetwork.Solana,
            address: 'InputTokenAddress123',
            logoURI: 'https://example.com/input.png',
          },
        ],
      })

      const result = augmentYield(yieldDto)

      expect(result.inputTokens).toHaveLength(1)
      expect(result.inputTokens[0].symbol).toBe('INPUT')
      expect(result.inputTokens[0].assetId).toBe(
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:InputTokenAddress123',
      )
    })

    it('should use token as inputToken when inputTokens is null', () => {
      const yieldDto = createMockYieldDto({
        inputTokens: null as unknown as YieldDto['inputTokens'],
        token: {
          name: 'CASH',
          symbol: 'CASH',
          decimals: 6,
          network: YieldNetwork.Solana,
          address: 'CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH',
          logoURI: 'https://example.com/cash.png',
        },
      })

      const result = augmentYield(yieldDto)

      expect(result.inputTokens).toHaveLength(1)
      expect(result.inputTokens[0].symbol).toBe('CASH')
      expect(result.inputTokens[0].assetId).toBe(
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH',
      )
    })

    it('should use token as inputToken when inputTokens is empty array', () => {
      const yieldDto = createMockYieldDto({
        inputTokens: [],
        token: {
          name: 'CASH',
          symbol: 'CASH',
          decimals: 6,
          network: YieldNetwork.Solana,
          address: 'CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH',
          logoURI: 'https://example.com/cash.png',
        },
      })

      const result = augmentYield(yieldDto)

      expect(result.inputTokens).toHaveLength(1)
      expect(result.inputTokens[0].symbol).toBe('CASH')
    })
  })

  describe('status preservation', () => {
    it('should preserve status.enter=true', () => {
      const yieldDto = createMockYieldDto({
        status: { enter: true, exit: true },
      })

      const result = augmentYield(yieldDto)

      expect(result.status.enter).toBe(true)
      expect(result.status.exit).toBe(true)
    })

    it('should preserve status.enter=false', () => {
      const yieldDto = createMockYieldDto({
        status: { enter: false, exit: true },
      })

      const result = augmentYield(yieldDto)

      expect(result.status.enter).toBe(false)
      expect(result.status.exit).toBe(true)
    })

    it('should preserve status.exit=false', () => {
      const yieldDto = createMockYieldDto({
        status: { enter: true, exit: false },
      })

      const result = augmentYield(yieldDto)

      expect(result.status.enter).toBe(true)
      expect(result.status.exit).toBe(false)
    })
  })

  describe('metadata preservation', () => {
    it('should preserve underMaintenance flag', () => {
      const yieldDto = createMockYieldDto({
        metadata: {
          name: 'Test',
          logoURI: '',
          description: '',
          underMaintenance: true,
          deprecated: false,
        },
      })

      const result = augmentYield(yieldDto)

      expect(result.metadata.underMaintenance).toBe(true)
    })

    it('should preserve deprecated flag', () => {
      const yieldDto = createMockYieldDto({
        metadata: {
          name: 'Test',
          logoURI: '',
          description: '',
          underMaintenance: false,
          deprecated: true,
        },
      })

      const result = augmentYield(yieldDto)

      expect(result.metadata.deprecated).toBe(true)
    })
  })
})
