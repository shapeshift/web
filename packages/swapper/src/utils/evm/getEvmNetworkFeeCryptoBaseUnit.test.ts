import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { Asset } from '@shapeshiftoss/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { TxBuildData } from '../../types'
import {
  getEvmNetworkFeeCryptoBaseUnit,
  getEvmRateNetworkFeeCryptoBaseUnit,
} from './getEvmNetworkFeeCryptoBaseUnit'
import type * as StateOverride from './stateOverride'
import { estimateGasWithStateOverride, getMinimalStateOverride } from './stateOverride'

vi.mock('./stateOverride', async importActual => ({
  ...(await importActual<typeof StateOverride>()),
  getMinimalStateOverride: vi.fn(),
  estimateGasWithStateOverride: vi.fn(),
}))

const gasFees = { gasPrice: '10' }

const makeTransactionData = (): Extract<TxBuildData, { type: 'evm' }> =>
  ({ type: 'evm', to: '0x1', data: '0x', value: '0' }) as Extract<TxBuildData, { type: 'evm' }>

const makeArgs = (adapter: Partial<EvmChainAdapter>) => ({
  adapter: adapter as EvmChainAdapter,
  supportsEIP1559: false,
  transactionData: makeTransactionData(),
  from: '0x0000000000000000000000000000000000000001',
  stateOverride: { sellAsset: {} as Asset, sellAmountCryptoBaseUnit: '1' },
})

describe('getEvmNetworkFeeCryptoBaseUnit state override', () => {
  beforeEach(() => {
    vi.mocked(getMinimalStateOverride).mockReset()
    vi.mocked(estimateGasWithStateOverride).mockReset()
  })

  it('buffers the override gas limit onto the tx and prices the buffered limit', async () => {
    vi.mocked(getMinimalStateOverride).mockResolvedValue([])
    vi.mocked(estimateGasWithStateOverride).mockResolvedValue('200')
    const args = makeArgs({ getGasFeeData: vi.fn().mockResolvedValue({ average: gasFees }) })

    await expect(getEvmNetworkFeeCryptoBaseUnit(args)).resolves.toBe('2400')
    expect(args.transactionData.gasLimit).toBe('240')
  })

  it('falls back to plain estimation when the override estimate fails', async () => {
    vi.mocked(getMinimalStateOverride).mockResolvedValue([])
    vi.mocked(estimateGasWithStateOverride).mockRejectedValue(new Error('estimate failed'))
    const getFeeData = vi.fn().mockResolvedValue({
      average: { chainSpecific: { gasLimit: '100', ...gasFees } },
    })
    const args = makeArgs({
      getGasFeeData: vi.fn().mockResolvedValue({ average: gasFees }),
      getFeeData,
    })

    await expect(getEvmNetworkFeeCryptoBaseUnit(args)).resolves.toBe('1200')
    expect(args.transactionData.gasLimit).toBe('120')
  })

  it('estimates over a provider gas limit already set on the tx', async () => {
    vi.mocked(getMinimalStateOverride).mockResolvedValue([])
    vi.mocked(estimateGasWithStateOverride).mockResolvedValue('200')
    const args = makeArgs({ getGasFeeData: vi.fn().mockResolvedValue({ average: gasFees }) })
    args.transactionData.gasLimit = '150'

    await expect(getEvmNetworkFeeCryptoBaseUnit(args)).resolves.toBe('2400')
    expect(args.transactionData.gasLimit).toBe('240')
  })

  it('signs the buffered provider limit when the needed override cannot be built', async () => {
    vi.mocked(getMinimalStateOverride).mockRejectedValue(
      new Error('Unable to locate allowance slot'),
    )
    const args = {
      ...makeArgs({ getGasFeeData: vi.fn().mockResolvedValue({ average: gasFees }) }),
      providerGasLimit: '300',
    }

    await expect(getEvmNetworkFeeCryptoBaseUnit(args)).resolves.toBe('3600')
    expect(args.transactionData.gasLimit).toBe('360')
    expect(estimateGasWithStateOverride).not.toHaveBeenCalled()
  })

  it('fails rather than trusting the provider limit when the overridden simulation reverts', async () => {
    vi.mocked(getMinimalStateOverride).mockResolvedValue([])
    vi.mocked(estimateGasWithStateOverride).mockRejectedValue(new Error('execution reverted'))
    const args = {
      ...makeArgs({
        getGasFeeData: vi.fn().mockResolvedValue({ average: gasFees }),
        getFeeData: vi.fn().mockRejectedValue(new Error('execution reverted')),
      }),
      providerGasLimit: '300',
    }

    await expect(getEvmNetworkFeeCryptoBaseUnit(args)).rejects.toThrow('execution reverted')
  })
})

describe('getEvmRateNetworkFeeCryptoBaseUnit', () => {
  beforeEach(() => {
    vi.mocked(getMinimalStateOverride).mockReset()
    vi.mocked(estimateGasWithStateOverride).mockReset()
  })

  it('prices the buffered provider limit without simulating', async () => {
    const { transactionData, from, stateOverride, ...feeArgs } = makeArgs({
      getGasFeeData: vi.fn().mockResolvedValue({ average: gasFees }),
    })

    await expect(
      getEvmRateNetworkFeeCryptoBaseUnit({
        ...feeArgs,
        providerGasLimit: '300',
        simulation: { transactionData, from, stateOverride },
      }),
    ).resolves.toBe('3600')
    expect(getMinimalStateOverride).not.toHaveBeenCalled()
  })

  it('simulates when the provider has no gas limit', async () => {
    vi.mocked(getMinimalStateOverride).mockResolvedValue([])
    vi.mocked(estimateGasWithStateOverride).mockResolvedValue('200')
    const { transactionData, from, stateOverride, ...feeArgs } = makeArgs({
      getGasFeeData: vi.fn().mockResolvedValue({ average: gasFees }),
    })

    await expect(
      getEvmRateNetworkFeeCryptoBaseUnit({
        ...feeArgs,
        providerGasLimit: undefined,
        simulation: { transactionData, from, stateOverride },
      }),
    ).resolves.toBe('2400')
  })
})
