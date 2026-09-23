import { tronChainId } from '@shapeshiftoss/caip'
import type { tron } from '@shapeshiftoss/chain-adapters'
import type { Asset } from '@shapeshiftoss/types'
import { describe, expect, it, vi } from 'vitest'

import { ETH } from '../test-data/assets'
import {
  getTronContractCallFallbackFeeCryptoBaseUnit,
  getTronContractCallNetworkFeeCryptoBaseUnit,
} from './getTronNetworkFeeCryptoBaseUnit'

const USDT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
const TRX: Asset = { ...ETH, assetId: `${tronChainId}/slip44:195`, chainId: tronChainId }
const USDT_TRON: Asset = { ...ETH, assetId: `${tronChainId}/trc20:${USDT}`, chainId: tronChainId }
const FROM = 'TT2T17KZhoDu47i2E4FWxfG79zdkEWkU9N'
const SPENDER_HEX = '4107a39ae4c49dee86e892450b20881f32cd5d500d'
const SPENDER = 'TAfbit1ENsRmtZbPQfYU3srURpfYuWYS7K'

const transactionData = { to: SPENDER, data: '0x2213bc0b', value: '0' }

const makeAdapter = ({ allowance = '0', simulation = 'ok' as 'ok' | 'revert' } = {}) => {
  const getFeeData =
    simulation === 'ok'
      ? vi.fn().mockResolvedValue({ fast: { txFee: '9000000' } })
      : vi.fn().mockRejectedValue(new Error('REVERT opcode executed'))
  const getTrc20Allowance = vi.fn().mockResolvedValue(allowance)

  const adapter = {
    getFeeData,
    httpProvider: {
      getTrc20Allowance,
      getChainPrices: () => Promise.resolve({ energyPrice: 100, bandwidthPrice: 1000 }),
    },
  }

  return { adapter: adapter as unknown as tron.ChainAdapter, getFeeData, getTrc20Allowance }
}

const baseArgs = {
  transactionData,
  from: FROM,
  sellAmountCryptoBaseUnit: '100000000',
  spenderAddress: SPENDER_HEX,
  fallbackEnergy: '450000',
}

describe('getTronContractCallFallbackFeeCryptoBaseUnit', () => {
  it('prices the energy at live prices and sizes bandwidth from the calldata', async () => {
    const { adapter } = makeAdapter()

    // 450000 energy * 100 sun + (4 calldata + 279 envelope) bytes * 1000 sun
    expect(
      await getTronContractCallFallbackFeeCryptoBaseUnit({
        adapter,
        data: '0x2213bc0b',
        energy: '450000',
      }),
    ).toBe('45283000')
  })
})

describe('getTronContractCallNetworkFeeCryptoBaseUnit', () => {
  it('prices a successful simulation without reading the allowance', async () => {
    const { adapter, getFeeData, getTrc20Allowance } = makeAdapter()

    const actual = await getTronContractCallNetworkFeeCryptoBaseUnit({
      ...baseArgs,
      adapter,
      sellAsset: USDT_TRON,
    })

    expect(actual).toBe('9000000')
    expect(getFeeData).toHaveBeenCalledWith({
      to: SPENDER,
      value: '0',
      chainSpecific: { from: FROM, data: '0x2213bc0b' },
    })
    expect(getTrc20Allowance).not.toHaveBeenCalled()
  })

  it('prices the measured worst case when a token sell reverts without its allowance', async () => {
    const { adapter, getTrc20Allowance } = makeAdapter({ simulation: 'revert', allowance: '0' })

    const actual = await getTronContractCallNetworkFeeCryptoBaseUnit({
      ...baseArgs,
      adapter,
      sellAsset: USDT_TRON,
    })

    expect(actual).toBe('45283000')
    expect(getTrc20Allowance).toHaveBeenCalledWith({
      contractAddress: USDT,
      owner: FROM,
      spender: SPENDER,
    })
  })

  it('throws when a token sell reverts with a sufficient allowance', async () => {
    const { adapter } = makeAdapter({ simulation: 'revert', allowance: '100000000' })

    await expect(
      getTronContractCallNetworkFeeCryptoBaseUnit({ ...baseArgs, adapter, sellAsset: USDT_TRON }),
    ).rejects.toThrow('REVERT opcode executed')
  })

  it('throws when a native sell reverts', async () => {
    const { adapter, getTrc20Allowance } = makeAdapter({ simulation: 'revert' })

    await expect(
      getTronContractCallNetworkFeeCryptoBaseUnit({ ...baseArgs, adapter, sellAsset: TRX }),
    ).rejects.toThrow('REVERT opcode executed')
    expect(getTrc20Allowance).not.toHaveBeenCalled()
  })
})
