import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { TronApi } from '../api'

const successResponse = {
  result: { result: true },
  energy_used: 64285,
  energy_penalty: 49635,
  constant_result: ['0000000000000000000000000000000000000000000000000000000000000000'],
  transaction: { ret: [{}] },
}

// A reverted simulation still reports result.result: true - the failure is only visible on
// transaction.ret and the message
const revertResponse = {
  result: { result: true, message: 'REVERT opcode executed' },
  energy_used: 7896,
  energy_penalty: 6079,
  constant_result: [''],
  transaction: { ret: [{ ret: 'FAILED' }] },
}

describe('TronApi', () => {
  const api = new TronApi({ rpcUrl: 'https://tron.example' })

  beforeEach(() => {
    vi.spyOn(api, 'getChainPrices').mockResolvedValue({ bandwidthPrice: 1000, energyPrice: 100 })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  describe('estimateContractCallFee', () => {
    const params = {
      contractAddress: 'TAfbit1ENsRmtZbPQfYU3srURpfYuWYS7K',
      from: 'TT2T17KZhoDu47i2E4FWxfG79zdkEWkU9N',
      data: '0x2213bc0b',
    }

    it('prices a successful simulation at energy_used * energyPrice', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: () => successResponse }))

      expect(await api.estimateContractCallFee(params)).toBe('6428500')
    })

    it('throws on a reverted simulation rather than trusting the partial energy', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: () => revertResponse }))

      await expect(api.estimateContractCallFee(params)).rejects.toThrow('REVERT opcode executed')
    })
  })

  describe('estimateTrc20TransferFee', () => {
    const params = {
      contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
      from: 'TT2T17KZhoDu47i2E4FWxfG79zdkEWkU9N',
      to: 'TT2T17KZhoDu47i2E4FWxfG79zdkEWkU9N',
      amount: '1',
    }

    const stubTriggerConstantContract = (response: unknown) => {
      const tronWeb = (api as unknown as { getTronWeb: () => any }).getTronWeb()
      vi.spyOn(tronWeb.transactionBuilder, 'triggerConstantContract').mockResolvedValue(response)
    }

    it('prices a successful simulation at energy_used * energyPrice', async () => {
      stubTriggerConstantContract(successResponse)

      expect(await api.estimateTrc20TransferFee(params)).toBe('6428500')
    })

    it('throws on a reverted simulation rather than trusting the partial energy', async () => {
      stubTriggerConstantContract(revertResponse)

      await expect(api.estimateTrc20TransferFee(params)).rejects.toThrow('REVERT opcode executed')
    })
  })
})
