import { tronChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { describe, expect, it, vi } from 'vitest'

import type { GetTradeQuoteInput, GetTradeRateInput, SwapperDeps } from '../../../types'
import { ETH } from '../../../utils/test-data/assets'
import type { SunioRoute } from '../types'
import { SUNIO_SMART_ROUTER_CONTRACT } from './constants'
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

const tronAdapter = (txFee = '9000000') => ({
  getFeeData: vi.fn().mockResolvedValue({ fast: { txFee } }),
  httpProvider: {
    getChainPrices: () => Promise.resolve({ energyPrice: 100, bandwidthPrice: 1000 }),
  },
})

const makeDeps = (tron: ReturnType<typeof tronAdapter>): SwapperDeps =>
  ({ assertGetTronChainAdapter: () => tron }) as unknown as SwapperDeps

const baseArgs = {
  route,
  sellAmountCryptoBaseUnit: '100000000',
  buyAmountCryptoBaseUnit: '30000000',
}

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

    it('fails the quote when the simulation fails', async () => {
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

      // 250000 energy * 100 sun + 1100 bytes * 1000 sun
      expect(actual.unwrap()).toEqual({ networkFeeCryptoBaseUnit: '26100000' })
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

      // 420000 energy * 100 sun + 1100 bytes * 1000 sun
      expect(actual.unwrap()).toEqual({ networkFeeCryptoBaseUnit: '43100000' })
    })
  })
})
