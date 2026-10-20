import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { Asset } from '@shapeshiftoss/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { TxBuildData } from '../../types'
import { getEvmNetworkFeeCryptoBaseUnit } from './getEvmNetworkFeeCryptoBaseUnit'
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

  it('prices the override gas limit and buffers it onto the tx', async () => {
    vi.mocked(getMinimalStateOverride).mockResolvedValue([])
    vi.mocked(estimateGasWithStateOverride).mockResolvedValue('200')
    const args = makeArgs({ getGasFeeData: vi.fn().mockResolvedValue({ average: gasFees }) })

    await expect(getEvmNetworkFeeCryptoBaseUnit(args)).resolves.toBe('2000')
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

    await expect(getEvmNetworkFeeCryptoBaseUnit(args)).resolves.toBe('1000')
    expect(args.transactionData.gasLimit).toBe('120')
  })
})
