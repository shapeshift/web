import { ethAssetId, ethChainId } from '@shapeshiftoss/caip'
import type { ChainAdapterManager } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import { describe, expect, it, vi } from 'vitest'

import type { ThorchainMimir } from '../types'
import { isChainHalted } from './isChainHalted'

import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'

vi.mock('@/context/PluginProvider/chainAdapterSingleton')

describe('isChainHalted', () => {
  const mockEthereumAdapter = {
    getFeeAssetId: () => ethAssetId,
  }

  vi.mocked(getChainAdapterManager).mockImplementation(
    () =>
      new Map([
        [KnownChainIds.EthereumMainnet, mockEthereumAdapter],
      ]) as unknown as ChainAdapterManager,
  )

  const baseMimir: ThorchainMimir = {
    HALTCHAINGLOBAL: 0,
    NODEPAUSECHAINGLOBAL: 41,
    HALTETHCHAIN: 0,
    SOLVENCYHALTETHCHAIN: 0,
  } as ThorchainMimir

  it('should return true when HALTCHAINGLOBAL is set', () => {
    const mimir: ThorchainMimir = {
      ...baseMimir,
      HALTCHAINGLOBAL: 1,
    } as ThorchainMimir

    expect(isChainHalted({ mimir, blockHeight: 42, chainId: ethChainId })).toBe(true)
  })

  it('should return true when NODEPAUSECHAINGLOBAL is greater than blockHeight', () => {
    const mimir: ThorchainMimir = {
      ...baseMimir,
      NODEPAUSECHAINGLOBAL: 42,
    } as ThorchainMimir

    expect(isChainHalted({ mimir, blockHeight: 40, chainId: ethChainId })).toBe(true)
  })

  it('should return true when chain-specific halt is set', () => {
    const mimir: ThorchainMimir = {
      ...baseMimir,
      HALTETHCHAIN: 1,
    } as ThorchainMimir

    expect(isChainHalted({ mimir, blockHeight: 42, chainId: ethChainId })).toBe(true)
  })

  it('should return true when chain-specific solvency halt is set', () => {
    const mimir: ThorchainMimir = {
      ...baseMimir,
      SOLVENCYHALTETHCHAIN: 1,
    } as ThorchainMimir

    expect(isChainHalted({ mimir, blockHeight: 42, chainId: ethChainId })).toBe(true)
  })

  it('should return false when no halt conditions are met', () => {
    expect(isChainHalted({ mimir: baseMimir, blockHeight: 42, chainId: ethChainId })).toBe(false)
  })
})
