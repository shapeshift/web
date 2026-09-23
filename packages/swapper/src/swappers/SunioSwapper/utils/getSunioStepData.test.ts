import { tronChainId } from '@shapeshiftoss/caip'
import { tron } from '@shapeshiftoss/chain-adapters'
import type { Asset } from '@shapeshiftoss/types'
import { describe, expect, it, vi } from 'vitest'

import type { GetTradeQuoteInput, GetTradeRateInput, SwapperDeps } from '../../../types'
import { ETH } from '../../../utils/test-data/assets'
import type { SunioRoute } from '../types'
import { buildSunioSwapCalldata } from './buildSwapContractCall'
import {
  SUNIO_FALLBACK_SWAP_ENERGY_NATIVE,
  SUNIO_FALLBACK_SWAP_ENERGY_TRC20,
  SUNIO_SMART_ROUTER_CONTRACT,
} from './constants'
import { getSunioStepData } from './getSunioStepData'

const USDT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
const TRX: Asset = { ...ETH, assetId: `${tronChainId}/slip44:195`, chainId: tronChainId }
const USDT_TRON: Asset = { ...ETH, assetId: `${tronChainId}/trc20:${USDT}`, chainId: tronChainId }
const FROM = 'TT2T17KZhoDu47i2E4FWxfG79zdkEWkU9N'

const route = {
  tokens: ['T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb', USDT],
  poolVersions: ['v2'],
  poolFees: ['0'],
} as SunioRoute

const tronAdapter = ({ txFee = '9000000', allowance = '0' } = {}) => ({
  getFeeData: vi.fn().mockResolvedValue({ fast: { txFee } }),
  httpProvider: {
    getChainPrices: () => Promise.resolve({ energyPrice: 100, bandwidthPrice: 1000 }),
    getTrc20Allowance: vi.fn().mockResolvedValue(allowance),
    getTrc20Balance: vi.fn().mockResolvedValue('100000000'),
  },
})

const makeDeps = (tron: ReturnType<typeof tronAdapter>): SwapperDeps =>
  ({ assertGetTronChainAdapter: () => tron }) as unknown as SwapperDeps

const baseArgs = {
  route,
  sellAmountCryptoBaseUnit: '100000000',
  buyAmountCryptoBaseUnit: '30000000',
}

// The calldata is fixed-width ABI, so its size doesn't depend on the recipient or deadline
const calldataBandwidthBytes = tron.getTronContractCallBandwidthBytes(
  buildSunioSwapCalldata({
    route,
    sellAmountCryptoBaseUnit: '100000000',
    minBuyAmountCryptoBaseUnit: '30000000',
    recipient: FROM,
    slippageTolerancePercentageDecimal: '0.005',
    deadline: 0,
  }),
)
const fallbackFee = (energy: string) =>
  String(Number(energy) * 1.2 * 100 + calldataBandwidthBytes * 1000)

describe('getSunioStepData', () => {
  describe('quote', () => {
    it('carries the router call as transactionData and simulates it', async () => {
      const adapter = tronAdapter()

      const actual = await getSunioStepData({
        ...baseArgs,
        type: 'quote',
        input: {
          receiveAddress: FROM,
          slippageTolerancePercentageDecimal: '0.01',
        } as GetTradeQuoteInput,
        deps: makeDeps(adapter),
        sellAsset: TRX,
        from: FROM,
      })

      const { transactionData, networkFeeCryptoBaseUnit, deadline } = actual.unwrap()

      expect(transactionData).toMatchObject({
        type: 'tron',
        to: SUNIO_SMART_ROUTER_CONTRACT,
        value: '100000000',
      })
      // swapExactInput selector
      expect(transactionData.data).toMatch(/^0x[0-9a-f]{8}/)
      expect(networkFeeCryptoBaseUnit).toBe('9000000')
      expect(deadline).toBeGreaterThan(Date.now())
      expect(adapter.getFeeData).toHaveBeenCalledWith({
        to: SUNIO_SMART_ROUTER_CONTRACT,
        value: '100000000',
        chainSpecific: { from: FROM, data: transactionData.data },
      })
    })

    it('sends no value for a token sell', async () => {
      const actual = await getSunioStepData({
        ...baseArgs,
        type: 'quote',
        input: { receiveAddress: FROM } as GetTradeQuoteInput,
        deps: makeDeps(tronAdapter()),
        sellAsset: USDT_TRON,
        from: FROM,
      })

      expect(actual.unwrap().transactionData.value).toBe('0')
    })

    it('fails a native quote when the simulation fails', async () => {
      const adapter = tronAdapter()
      adapter.getFeeData.mockRejectedValue(new Error('REVERT opcode executed'))

      const actual = await getSunioStepData({
        ...baseArgs,
        type: 'quote',
        input: { receiveAddress: FROM } as GetTradeQuoteInput,
        deps: makeDeps(adapter),
        sellAsset: TRX,
        from: FROM,
      })

      expect(actual.isErr()).toBe(true)
    })

    it('prices the token worst case when the allowance is not granted yet', async () => {
      const adapter = tronAdapter({ allowance: '0' })
      adapter.getFeeData.mockRejectedValue(new Error('REVERT opcode executed'))

      const actual = await getSunioStepData({
        ...baseArgs,
        type: 'quote',
        input: { receiveAddress: FROM } as GetTradeQuoteInput,
        deps: makeDeps(adapter),
        sellAsset: USDT_TRON,
        from: FROM,
      })

      const { transactionData, networkFeeCryptoBaseUnit } = actual.unwrap()

      expect(transactionData.to).toBe(SUNIO_SMART_ROUTER_CONTRACT)
      expect(networkFeeCryptoBaseUnit).toBe(fallbackFee(SUNIO_FALLBACK_SWAP_ENERGY_TRC20))
      expect(adapter.httpProvider.getTrc20Allowance).toHaveBeenCalledWith({
        contractAddress: USDT,
        owner: FROM,
        spender: SUNIO_SMART_ROUTER_CONTRACT,
      })
    })

    it('fails a token quote that reverts with its allowance in place', async () => {
      const adapter = tronAdapter({ allowance: '100000000' })
      adapter.getFeeData.mockRejectedValue(new Error('REVERT opcode executed'))

      const actual = await getSunioStepData({
        ...baseArgs,
        type: 'quote',
        input: { receiveAddress: FROM } as GetTradeQuoteInput,
        deps: makeDeps(adapter),
        sellAsset: USDT_TRON,
        from: FROM,
      })

      expect(actual.isErr()).toBe(true)
    })
  })

  describe('rate', () => {
    it('simulates from the receive address when present', async () => {
      const actual = await getSunioStepData({
        ...baseArgs,
        type: 'rate',
        input: { receiveAddress: FROM } as GetTradeRateInput,
        deps: makeDeps(tronAdapter()),
        sellAsset: TRX,
        from: FROM,
      })

      expect(actual.unwrap()).toEqual({ networkFeeCryptoBaseUnit: '9000000' })
    })

    it('prices the measured worst case without an address to simulate from', async () => {
      const actual = await getSunioStepData({
        ...baseArgs,
        type: 'rate',
        input: {} as GetTradeRateInput,
        deps: makeDeps(tronAdapter()),
        sellAsset: TRX,
      })

      expect(actual.unwrap()).toEqual({
        networkFeeCryptoBaseUnit: fallbackFee(SUNIO_FALLBACK_SWAP_ENERGY_NATIVE),
      })
    })

    it('prices the token worst case when a pre-approval simulation reverts', async () => {
      const adapter = tronAdapter()
      adapter.getFeeData.mockRejectedValue(new Error('REVERT opcode executed'))

      const actual = await getSunioStepData({
        ...baseArgs,
        type: 'rate',
        input: { receiveAddress: FROM } as GetTradeRateInput,
        deps: makeDeps(adapter),
        sellAsset: USDT_TRON,
        from: FROM,
      })

      expect(actual.unwrap()).toEqual({
        networkFeeCryptoBaseUnit: fallbackFee(SUNIO_FALLBACK_SWAP_ENERGY_TRC20),
      })
    })
  })
})
