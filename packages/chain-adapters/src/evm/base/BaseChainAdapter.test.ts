import type { EvmChainId } from '@shapeshiftoss/types'
import type * as unchained from '@shapeshiftoss/unchained-client'
import { describe, expect, it, vi } from 'vitest'

import type { GetFeeDataInput } from '../../types'
import * as base from './BaseChainAdapter'

const gasFees = {
  l1GasPrice: '10',
  slow: { gasPrice: '4', maxFeePerGas: '240', maxPriorityFeePerGas: '8' },
  average: { gasPrice: '5', maxFeePerGas: '300', maxPriorityFeePerGas: '10' },
  fast: { gasPrice: '6', maxFeePerGas: '360', maxPriorityFeePerGas: '12' },
}

const makeAdapter = (http: Partial<unchained.base.V1Api>) =>
  new base.ChainAdapter({
    providers: {
      http: http as unchained.base.V1Api,
      ws: {} as unchained.ws.Client<unchained.base.Tx>,
    },
    rpcUrl: '',
  })

describe('BaseChainAdapter', () => {
  it('adds the l1 gas price to every speed', async () => {
    const adapter = makeAdapter({ getGasFees: vi.fn().mockResolvedValue(gasFees) })

    await expect(adapter.getGasFeeData()).resolves.toEqual({
      slow: { ...gasFees.slow, l1GasPrice: '10' },
      average: { ...gasFees.average, l1GasPrice: '10' },
      fast: { ...gasFees.fast, l1GasPrice: '10' },
    })
  })

  it('includes the l1 fee in the network fee', async () => {
    const adapter = makeAdapter({
      estimateGas: vi.fn().mockResolvedValue({ gasLimit: '21000', l1GasLimit: '3500' }),
      getGasFees: vi.fn().mockResolvedValue(gasFees),
    })

    const input: GetFeeDataInput<EvmChainId> = {
      to: '0x642F4Bda144C63f6DC47EE0fDfbac0a193e2eDb7',
      value: '123',
      chainSpecific: { from: '0x0000000000000000000000000000000000000000', data: '0x' },
    }

    const feeData = await adapter.getFeeData(input)

    expect(feeData.slow.txFee).toBe('5075000')
    expect(feeData.average.txFee).toBe('6335000')
    expect(feeData.fast.txFee).toBe('7595000')
    expect(feeData.average.chainSpecific).toEqual({
      gasLimit: '21000',
      l1GasLimit: '3500',
      ...gasFees.average,
      l1GasPrice: '10',
    })
  })
})
