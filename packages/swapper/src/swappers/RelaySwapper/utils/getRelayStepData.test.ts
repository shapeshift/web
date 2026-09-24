import { tronChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { describe, expect, it, vi } from 'vitest'

import type { GetTradeQuoteInput, GetTradeRateInput, SwapperDeps } from '../../../types'
import { ETH } from '../../../utils/test-data/assets'
import { getRelayStepData } from './getRelayStepData'
import { getRelayAllowanceContract } from './helpers'
import type { RelayQuoteTronItemData } from './types'

const USDT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
const TRX: Asset = { ...ETH, assetId: `${tronChainId}/slip44:195`, chainId: tronChainId }
const USDT_TRON: Asset = { ...ETH, assetId: `${tronChainId}/trc20:${USDT}`, chainId: tronChainId }
const FROM = 'TT2T17KZhoDu47i2E4FWxfG79zdkEWkU9N'
const DEPOSITOR_HEX = '41f0623e1012177482912fb057e44e1a9769b1f588'
const DEPOSITOR = 'TXtEs6t2oUWQsNos7m68gbHdE9Q5n6x2oN'

const tronItem: RelayQuoteTronItemData = {
  type: 'TriggerSmartContract',
  parameter: { contract_address: DEPOSITOR_HEX, data: '49290c1c', call_value: 50000000 },
}

const tronAdapter = ({ txFee = '9000000', allowance = '0' } = {}) => ({
  getFeeData: vi.fn().mockResolvedValue({ fast: { txFee } }),
  httpProvider: {
    getChainPrices: () => Promise.resolve({ energyPrice: 100, bandwidthPrice: 1000 }),
    getTrc20Allowance: vi.fn().mockResolvedValue(allowance),
    getTrc20Balance: vi.fn().mockResolvedValue('100000000'),
    getContractEnergyShare: vi.fn().mockResolvedValue({
      callerPercent: 100,
      originEnergyLimit: 0,
      originEnergyAvailable: 0,
    }),
  },
})

const makeDeps = (tron: ReturnType<typeof tronAdapter>): SwapperDeps =>
  ({ assertGetTronChainAdapter: () => tron }) as unknown as SwapperDeps

const baseArgs = {
  data: tronItem,
  sellAsset: TRX,
  sellAmountCryptoBaseUnit: '50000000',
  spenderAddress: '',
  orderId: undefined,
  xpub: undefined,
  fallbackNetworkFeeCryptoBaseUnit: '6100715',
}

describe('getRelayAllowanceContract', () => {
  it('returns the tron depositor as relay gives it', () => {
    expect(getRelayAllowanceContract(tronItem)).toBe(DEPOSITOR_HEX)
  })
})

describe('getRelayStepData', () => {
  describe('tron', () => {
    it('carries the depositor call as transactionData and simulates it', async () => {
      const adapter = tronAdapter()

      const actual = await getRelayStepData({
        ...baseArgs,
        type: 'quote',
        input: {} as GetTradeQuoteInput,
        from: FROM,
        deps: makeDeps(adapter),
      })

      const transactionData = {
        type: 'tron',
        to: DEPOSITOR_HEX,
        data: '49290c1c',
        value: '50000000',
      }

      expect(actual.unwrap()).toEqual({ transactionData, networkFeeCryptoBaseUnit: '9000000' })
      expect(adapter.getFeeData).toHaveBeenCalledWith({
        to: DEPOSITOR_HEX,
        value: '50000000',
        chainSpecific: { from: FROM, data: '49290c1c' },
      })
    })

    it('fails a native quote when the simulation fails', async () => {
      const adapter = tronAdapter()
      adapter.getFeeData.mockRejectedValue(new Error('REVERT opcode executed'))

      const actual = await getRelayStepData({
        ...baseArgs,
        type: 'quote',
        input: {} as GetTradeQuoteInput,
        from: FROM,
        deps: makeDeps(adapter),
      })

      expect(actual.isErr()).toBe(true)
    })

    it('prices the measured worst case when a token allowance is not granted yet', async () => {
      const adapter = tronAdapter({ allowance: '0' })
      adapter.getFeeData.mockRejectedValue(new Error('REVERT opcode executed'))

      const actual = await getRelayStepData({
        ...baseArgs,
        data: { type: 'TriggerSmartContract', parameter: { ...tronItem.parameter, call_value: 0 } },
        sellAsset: USDT_TRON,
        type: 'quote',
        input: {} as GetTradeQuoteInput,
        from: FROM,
        deps: makeDeps(adapter),
      })

      // 100000 energy * 1.2 margin * 100 sun + (4 calldata + 279 envelope) bytes * 1000 sun
      expect(actual.unwrap().networkFeeCryptoBaseUnit).toBe('12283000')
      expect(adapter.httpProvider.getTrc20Allowance).toHaveBeenCalledWith({
        contractAddress: USDT,
        owner: FROM,
        spender: DEPOSITOR,
      })
    })

    it('prices a rate from the measured deposit', async () => {
      const adapter = tronAdapter()

      const actual = await getRelayStepData({
        ...baseArgs,
        type: 'rate',
        input: {} as GetTradeRateInput,
        from: FROM,
        deps: makeDeps(adapter),
      })

      // 100000 energy * 1.2 margin * 100 sun + (4 calldata + 279 envelope) bytes * 1000 sun
      expect(actual.unwrap()).toEqual({ networkFeeCryptoBaseUnit: '12283000' })
      expect(adapter.httpProvider.getContractEnergyShare).toHaveBeenCalledWith(DEPOSITOR)
    })

    it('falls back to the relay fee when the measured deposit cannot be priced', async () => {
      const adapter = tronAdapter()
      adapter.httpProvider.getChainPrices = () => Promise.reject(new Error('429'))

      const actual = await getRelayStepData({
        ...baseArgs,
        type: 'rate',
        input: {} as GetTradeRateInput,
        from: FROM,
        deps: makeDeps(adapter),
      })

      expect(actual.unwrap()).toEqual({ networkFeeCryptoBaseUnit: '6100715' })
    })

    it('fails to build without the depositor call', async () => {
      const actual = await getRelayStepData({
        ...baseArgs,
        data: { type: 'TriggerSmartContract', parameter: {} },
        type: 'quote',
        input: {} as GetTradeQuoteInput,
        from: FROM,
        deps: makeDeps(tronAdapter()),
      })

      expect(actual.isErr()).toBe(true)
    })
  })
})
