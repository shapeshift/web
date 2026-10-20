import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { Asset } from '@shapeshiftoss/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { TxBuildData } from '../../types'
import { getEvmNetworkFeeCryptoBaseUnit } from './getEvmNetworkFeeCryptoBaseUnit'
import { estimateGasWithStateOverride, getMinimalStateOverride } from './stateOverride'

vi.mock('./stateOverride', async importActual => ({
  ...(await importActual<typeof import('./stateOverride')>()),
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

  it('skips the early gas price fetch when no override is needed', async () => {
    vi.mocked(getMinimalStateOverride).mockResolvedValue(undefined)
    const getGasFeeData = vi.fn()
    const getFeeData = vi.fn().mockResolvedValue({
      average: { chainSpecific: { gasLimit: '100', ...gasFees } },
    })

    const fee = await getEvmNetworkFeeCryptoBaseUnit(makeArgs({ getGasFeeData, getFeeData }))

    expect(fee).toBe('1000')
    expect(getGasFeeData).not.toHaveBeenCalled()
    expect(getFeeData).toHaveBeenCalledTimes(1)
  })

  it('fetches gas prices while the override estimate is in flight', async () => {
    vi.mocked(getMinimalStateOverride).mockResolvedValue([])
    let resolveEstimate: (gasLimit: string) => void = () => {}
    vi.mocked(estimateGasWithStateOverride).mockReturnValue(
      new Promise(resolve => (resolveEstimate = resolve)),
    )
    const getGasFeeData = vi.fn().mockResolvedValue({ average: gasFees })
    const args = makeArgs({ getGasFeeData })

    const fee = getEvmNetworkFeeCryptoBaseUnit(args)
    await vi.waitFor(() => expect(getGasFeeData).toHaveBeenCalledTimes(1))
    resolveEstimate('200')

    await expect(fee).resolves.toBe('2000')
    expect(getGasFeeData).toHaveBeenCalledTimes(1)
    expect(args.transactionData.gasLimit).toBe('240')
  })

  it('falls back to plain estimation when the override and gas prices fail', async () => {
    vi.mocked(getMinimalStateOverride).mockResolvedValue([])
    vi.mocked(estimateGasWithStateOverride).mockReturnValue(
      new Promise((_, reject) => setTimeout(() => reject(new Error('estimate failed')), 10)),
    )
    const getFeeData = vi.fn().mockResolvedValue({
      average: { chainSpecific: { gasLimit: '100', ...gasFees } },
    })

    // Plain function (spies attach handlers): gas prices fail while the estimate is in flight
    const fee = await getEvmNetworkFeeCryptoBaseUnit(
      makeArgs({ getGasFeeData: () => Promise.reject(new Error('gas fees failed')), getFeeData }),
    )

    expect(fee).toBe('1000')
    expect(getFeeData).toHaveBeenCalledTimes(1)
  })
})
