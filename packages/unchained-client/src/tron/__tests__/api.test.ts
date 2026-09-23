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
    vi.spyOn(api, 'getChainPrices').mockResolvedValue({
      bandwidthPrice: 1000,
      energyPrice: 100,
      memoFee: 1_000_000,
    })
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
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => successResponse }))

      expect(await api.estimateContractCallFee(params)).toBe('6428500')
    })

    it('throws on a reverted simulation rather than trusting the partial energy', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => revertResponse }))

      await expect(api.estimateContractCallFee(params)).rejects.toThrow('REVERT opcode executed')
    })

    it('reports a failed request as such rather than as a revert', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: false, status: 429, json: () => ({}) }),
      )

      await expect(api.estimateContractCallFee(params)).rejects.toThrow('request failed: 429')
    })
  })

  describe('getChainPrices', () => {
    it('reads the energy, bandwidth and memo parameters', async () => {
      vi.restoreAllMocks()
      const tronWeb = (api as unknown as { getTronWeb: () => any }).getTronWeb()
      vi.spyOn(tronWeb.trx, 'getChainParameters').mockResolvedValue([
        { key: 'getTransactionFee', value: 1000 },
        { key: 'getEnergyFee', value: 100 },
        { key: 'getMemoFee', value: 1_000_000 },
      ])

      expect(await api.getChainPrices()).toEqual({
        bandwidthPrice: 1000,
        energyPrice: 100,
        memoFee: 1_000_000,
      })
    })

    it('throws rather than defaulting when the node is unreachable', async () => {
      vi.restoreAllMocks()
      const tronWeb = (api as unknown as { getTronWeb: () => any }).getTronWeb()
      vi.spyOn(tronWeb.trx, 'getChainParameters').mockRejectedValue(new Error('ECONNREFUSED'))

      await expect(api.getChainPrices()).rejects.toThrow('ECONNREFUSED')
    })
  })

  describe('getTrc20Balance', () => {
    it('reads balanceOf(address) with a single constant call', async () => {
      const tronWeb = (api as unknown as { getTronWeb: () => any }).getTronWeb()
      const trigger = vi
        .spyOn(tronWeb.transactionBuilder, 'triggerConstantContract')
        .mockResolvedValue({
          result: { result: true },
          constant_result: ['00000000000000000000000000000000000000000000000000000000028e6fb0'],
        } as any)

      const actual = await api.getTrc20Balance({
        contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        address: 'TE6oHVdTbcp1Q9XBYx5VzjWbZEg3t3Jrnc',
      })

      expect(actual).toBe('42889136')
      expect(trigger).toHaveBeenCalledWith(
        'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        'balanceOf(address)',
        {},
        [{ type: 'address', value: 'TE6oHVdTbcp1Q9XBYx5VzjWbZEg3t3Jrnc' }],
        'TE6oHVdTbcp1Q9XBYx5VzjWbZEg3t3Jrnc',
      )
    })
  })

  describe('getTrc20Allowance', () => {
    it('reads allowance(owner, spender) with a single constant call', async () => {
      const tronWeb = (api as unknown as { getTronWeb: () => any }).getTronWeb()
      const trigger = vi
        .spyOn(tronWeb.transactionBuilder, 'triggerConstantContract')
        .mockResolvedValue({
          result: { result: true },
          constant_result: ['000000000000000000000000000000000000000000000000000000000000007b'],
        } as any)

      const actual = await api.getTrc20Allowance({
        contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        owner: 'TT2T17KZhoDu47i2E4FWxfG79zdkEWkU9N',
        spender: 'TAfbit1ENsRmtZbPQfYU3srURpfYuWYS7K',
      })

      expect(actual).toBe('123')
      expect(trigger).toHaveBeenCalledWith(
        'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        'allowance(address,address)',
        {},
        [
          { type: 'address', value: 'TT2T17KZhoDu47i2E4FWxfG79zdkEWkU9N' },
          { type: 'address', value: 'TAfbit1ENsRmtZbPQfYU3srURpfYuWYS7K' },
        ],
        'TT2T17KZhoDu47i2E4FWxfG79zdkEWkU9N',
      )
    })
  })

  describe('isAccountActivated', () => {
    it('is true for an account the node knows', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: true, json: () => ({ address: '41abc', balance: 1 }) }),
      )

      expect(await api.isAccountActivated('TT2T17KZhoDu47i2E4FWxfG79zdkEWkU9N')).toBe(true)
    })

    it('is false for a fresh address', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => ({}) }))

      expect(await api.isAccountActivated('TT2T17KZhoDu47i2E4FWxfG79zdkEWkU9N')).toBe(false)
    })

    it('throws on an error response rather than reading it as not activated', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: false, status: 429, json: () => ({ Error: 'throttled' }) }),
      )

      await expect(api.isAccountActivated('TT2T17KZhoDu47i2E4FWxfG79zdkEWkU9N')).rejects.toThrow(
        '429',
      )
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
