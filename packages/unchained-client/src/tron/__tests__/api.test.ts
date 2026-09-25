import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getCallerEnergy, TronApi } from '../api'

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
    vi.spyOn(api, 'getContractEnergyShare').mockResolvedValue({
      callerPercent: 100,
      originEnergyLimit: 0,
      originEnergyAvailable: 0,
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

    it('prices the caller in full when the share lookup fails', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => successResponse }))
      vi.mocked(api.getContractEnergyShare).mockRejectedValue(new Error('429'))

      expect(await api.estimateContractCallFee(params)).toBe('6428500')
    })

    it('fails instead when the caller requires the share', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => successResponse }))
      vi.mocked(api.getContractEnergyShare).mockRejectedValue(new Error('429'))

      await expect(
        api.estimateContractCallFee({ ...params, requireEnergyShare: true }),
      ).rejects.toThrow('429')
    })

    it('bills the caller only their share when the deployer covers the rest', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => successResponse }))
      vi.mocked(api.getContractEnergyShare).mockResolvedValue({
        callerPercent: 5,
        originEnergyLimit: 10_000_000,
        originEnergyAvailable: 5_000_000,
      })

      // 64285 - floor(64285 * 0.95) = 3215
      expect(await api.estimateContractCallFee(params)).toBe('321500')
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

  describe('getCallerEnergy', () => {
    it('charges the caller in full when the contract sets no deployer share', () => {
      const share = {
        callerPercent: 100,
        originEnergyLimit: 0,
        originEnergyAvailable: 0,
      }
      expect(getCallerEnergy(901_682, share)).toBe(901_682)
    })

    it('charges the caller their percent when the deployer has the energy staked', () => {
      const share = {
        callerPercent: 5,
        originEnergyLimit: 10_000_000,
        originEnergyAvailable: 5_000_000,
      }
      expect(getCallerEnergy(901_682, share)).toBe(45_085)
    })

    it('charges the caller in full when the deployer has nothing staked', () => {
      const share = {
        callerPercent: 30,
        originEnergyLimit: 10_000_000,
        originEnergyAvailable: 0,
      }
      expect(getCallerEnergy(130_285, share)).toBe(130_285)
    })

    it('caps the deployer share at their per-call limit', () => {
      const share = {
        callerPercent: 0,
        originEnergyLimit: 100_000,
        originEnergyAvailable: 5_000_000,
      }
      expect(getCallerEnergy(300_000, share)).toBe(200_000)
    })

    it('caps the deployer share at what they have left', () => {
      const share = {
        callerPercent: 0,
        originEnergyLimit: 10_000_000,
        originEnergyAvailable: 40_000,
      }
      expect(getCallerEnergy(300_000, share)).toBe(260_000)
    })
  })

  describe('getContractEnergyShare', () => {
    const contractResponse = {
      consume_user_resource_percent: 5,
      origin_energy_limit: 10_000_000,
      origin_address: 'TDeployer',
    }
    const resourceResponse = { EnergyLimit: 6_000_000, EnergyUsed: 1_000_000 }
    const respond = (...bodies: unknown[]) => {
      const fetchMock = vi.fn()
      bodies.forEach(body => fetchMock.mockResolvedValueOnce({ ok: true, json: () => body }))
      vi.stubGlobal('fetch', fetchMock)
      return fetchMock
    }
    // the contract record is cached per instance, so each case gets its own
    const freshApi = () => new TronApi({ rpcUrl: 'https://tron.example' })

    it('reads the caller percent, per-call limit and the unspent deployer energy', async () => {
      respond(contractResponse, resourceResponse)

      expect(await freshApi().getContractEnergyShare('TRouter')).toEqual({
        callerPercent: 5,
        originEnergyLimit: 10_000_000,
        originEnergyAvailable: 5_000_000,
      })
    })

    it('reads an omitted percent as the deployer paying everything', async () => {
      respond({ origin_energy_limit: 10_000_000, origin_address: 'TDeployer' }, resourceResponse)

      expect(await freshApi().getContractEnergyShare('TRouter')).toMatchObject({ callerPercent: 0 })
    })

    it('reads an omitted per-call limit as the creator default', async () => {
      respond({ consume_user_resource_percent: 5, origin_address: 'TDeployer' }, resourceResponse)

      expect(await freshApi().getContractEnergyShare('TRouter')).toMatchObject({
        originEnergyLimit: 10_000_000,
      })
    })

    it('reads a plain address as a call the caller pays in full without a resource lookup', async () => {
      const fetchMock = respond({})

      expect(await freshApi().getContractEnergyShare('TPlain')).toEqual({
        callerPercent: 100,
        originEnergyLimit: 0,
        originEnergyAvailable: 0,
      })
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('re-reads an empty body rather than caching it as a plain address', async () => {
      const fetchMock = respond({}, contractResponse, resourceResponse)
      const api = freshApi()

      await api.getContractEnergyShare('TRouter')
      expect(await api.getContractEnergyShare('TRouter')).toMatchObject({ callerPercent: 5 })
      expect(fetchMock).toHaveBeenCalledTimes(3)
    })

    it('rejects a failed lookup rather than guessing the split', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }))

      await expect(freshApi().getContractEnergyShare('TRouter')).rejects.toThrow('429')
    })

    it('does not cache an error body the node returns with a 200', async () => {
      const fetchMock = respond(
        { Error: 'class org.tron.core.exception' },
        contractResponse,
        resourceResponse,
      )
      const api = freshApi()

      await expect(api.getContractEnergyShare('TRouter')).rejects.toThrow('getcontract failed')
      expect(await api.getContractEnergyShare('TRouter')).toMatchObject({ callerPercent: 5 })
      expect(fetchMock).toHaveBeenCalledTimes(3)
    })

    it('reads the contract once and the deployer energy once per refresh window', async () => {
      vi.useFakeTimers()
      const fetchMock = respond(contractResponse, resourceResponse, resourceResponse)
      const api = freshApi()

      await api.getContractEnergyShare('TRouter')
      await api.getContractEnergyShare('TRouter')
      expect(fetchMock).toHaveBeenCalledTimes(2)

      vi.advanceTimersByTime(16_000)
      await api.getContractEnergyShare('TRouter')
      expect(fetchMock).toHaveBeenCalledTimes(3)
      const contractReads = fetchMock.mock.calls.filter(([url]) =>
        String(url).endsWith('/wallet/getcontract'),
      )
      expect(contractReads).toHaveLength(1)
      vi.useRealTimers()
    })

    it('re-reads the contract after a minute, since its split can change', async () => {
      vi.useFakeTimers()
      const fetchMock = respond(
        contractResponse,
        resourceResponse,
        contractResponse,
        resourceResponse,
      )
      const api = freshApi()

      await api.getContractEnergyShare('TRouter')
      vi.advanceTimersByTime(61_000)
      await api.getContractEnergyShare('TRouter')

      const contractReads = fetchMock.mock.calls.filter(([url]) =>
        String(url).endsWith('/wallet/getcontract'),
      )
      expect(contractReads).toHaveLength(2)
      vi.useRealTimers()
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

  describe('getTrc20Decimals', () => {
    const USDT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
    const eighteen = '0000000000000000000000000000000000000000000000000000000000000012'

    it('reads decimals() with a single constant call', async () => {
      const freshApi = new TronApi({ rpcUrl: 'https://tron.example' })
      const tronWeb = (freshApi as unknown as { getTronWeb: () => any }).getTronWeb()
      const trigger = vi
        .spyOn(tronWeb.transactionBuilder, 'triggerConstantContract')
        .mockResolvedValue({ result: { result: true }, constant_result: [eighteen] } as any)

      expect(await freshApi.getTrc20Decimals({ contractAddress: USDT })).toBe(18)
      expect(trigger).toHaveBeenCalledWith(USDT, 'decimals()', {}, [], USDT)
    })

    it('reads each contract once', async () => {
      const freshApi = new TronApi({ rpcUrl: 'https://tron.example' })
      const tronWeb = (freshApi as unknown as { getTronWeb: () => any }).getTronWeb()
      const trigger = vi
        .spyOn(tronWeb.transactionBuilder, 'triggerConstantContract')
        .mockResolvedValue({ result: { result: true }, constant_result: [eighteen] } as any)

      await freshApi.getTrc20Decimals({ contractAddress: USDT })
      await freshApi.getTrc20Decimals({ contractAddress: USDT })

      expect(trigger).toHaveBeenCalledTimes(1)
    })

    it('reads a failed call as unknown and retries it next time', async () => {
      const freshApi = new TronApi({ rpcUrl: 'https://tron.example' })
      const tronWeb = (freshApi as unknown as { getTronWeb: () => any }).getTronWeb()
      const trigger = vi
        .spyOn(tronWeb.transactionBuilder, 'triggerConstantContract')
        .mockRejectedValueOnce(new Error('429'))
        .mockResolvedValue({ result: { result: true }, constant_result: [eighteen] } as any)

      expect(await freshApi.getTrc20Decimals({ contractAddress: USDT })).toBeUndefined()
      expect(await freshApi.getTrc20Decimals({ contractAddress: USDT })).toBe(18)
      expect(trigger).toHaveBeenCalledTimes(2)
    })
  })

  describe('getAccount', () => {
    const USDT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
    const PUBKEY = 'TE6oHVdTbcp1Q9XBYx5VzjWbZEg3t3Jrnc'

    const respondAccount = () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({ json: () => ({ balance: 5, assetV2: [{ key: '1002000', value: 7 }] }) })
        .mockResolvedValueOnce({ json: () => ({ data: [{ trc20: [{ [USDT]: '100' }] }] }) })
      vi.stubGlobal('fetch', fetchMock)
    }

    const getAccount = async (freshApi: TronApi) => {
      vi.useFakeTimers()
      try {
        const pending = freshApi.getAccount({ pubkey: PUBKEY })
        await vi.runAllTimersAsync()
        return await pending
      } finally {
        vi.useRealTimers()
      }
    }

    it('attaches on-chain decimals to trc20 tokens and leaves trc10 tokens alone', async () => {
      const freshApi = new TronApi({ rpcUrl: 'https://tron.example' })
      respondAccount()
      vi.spyOn(freshApi, 'getTrc20Decimals').mockResolvedValue(18)

      const account = await getAccount(freshApi)

      expect(account.tokens).toEqual([
        { contractAddress: '1002000', balance: '7' },
        { contractAddress: USDT, balance: '100', decimals: 18 },
      ])
    })

    it('still returns a trc20 token whose decimals could not be read', async () => {
      const freshApi = new TronApi({ rpcUrl: 'https://tron.example' })
      respondAccount()
      vi.spyOn(freshApi, 'getTrc20Decimals').mockResolvedValue(undefined)

      const account = await getAccount(freshApi)

      expect(account.tokens).toEqual([
        { contractAddress: '1002000', balance: '7' },
        { contractAddress: USDT, balance: '100' },
      ])
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
