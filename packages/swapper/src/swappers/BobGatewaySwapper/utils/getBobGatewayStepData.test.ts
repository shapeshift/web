import type { GatewayQuoteV4 } from '@gobob/bob-sdk'
import { tronChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { Ok } from '@sniptt/monads'
import { describe, expect, it, vi } from 'vitest'

import type { GetTradeQuoteInput, GetTradeRateInput, SwapperDeps } from '../../../types'
import { ETH } from '../../../utils/test-data/assets'
import { getBobGatewayStepData } from './getBobGatewayStepData'
import { createBobGatewayOrder } from './helpers'

vi.mock('./helpers', () => ({ createBobGatewayOrder: vi.fn() }))

const USDT_TRON: Asset = {
  ...ETH,
  assetId: `${tronChainId}/trc20:TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`,
  chainId: tronChainId,
}

const FROM = 'TT2T17KZhoDu47i2E4FWxfG79zdkEWkU9N'
// BOB returns the AllowanceHolder as 0x-prefixed 41-hex (TAfbit1ENsRmtZbPQfYU3srURpfYuWYS7K)
const ALLOWANCE_HOLDER_HEX = '0x4107a39ae4c49dee86e892450b20881f32cd5d500d'

const tronTx = { type: 'tron' as const, to: ALLOWANCE_HOLDER_HEX, data: '0x2213bc0b', value: '0' }

const tronAdapter = (txFee = '45600000') => ({
  getFeeData: vi.fn().mockResolvedValue({ fast: { txFee } }),
  httpProvider: {
    getChainPrices: () => Promise.resolve({ energyPrice: 100, bandwidthPrice: 1000 }),
  },
})

const makeDeps = (tron: ReturnType<typeof tronAdapter>): SwapperDeps =>
  ({ config: {}, assertGetTronChainAdapter: () => tron }) as unknown as SwapperDeps

const quote = {} as GatewayQuoteV4

describe('getBobGatewayStepData', () => {
  describe('tron', () => {
    it('prices a rate from the measured default energy and bandwidth', async () => {
      const actual = await getBobGatewayStepData({
        type: 'rate',
        input: {} as GetTradeRateInput,
        deps: makeDeps(tronAdapter()),
        quote,
        sellAsset: USDT_TRON,
        sellAmountCryptoBaseUnit: '100000000',
        spenderAddress: '',
      })

      // 450000 energy * 100 sun + 4000 bytes * 1000 sun
      expect(actual.unwrap()).toEqual({ networkFeeCryptoBaseUnit: '49000000' })
    })

    it('simulates the real gateway call for a quote', async () => {
      vi.mocked(createBobGatewayOrder).mockResolvedValue(
        Ok({ offramp: { orderId: 'order-1', tx: tronTx } }) as any,
      )
      const adapter = tronAdapter()

      const actual = await getBobGatewayStepData({
        type: 'quote',
        input: {} as GetTradeQuoteInput,
        deps: makeDeps(adapter),
        quote,
        sellAsset: USDT_TRON,
        sellAmountCryptoBaseUnit: '100000000',
        spenderAddress: '',
        from: FROM,
      })

      expect(adapter.getFeeData).toHaveBeenCalledWith({
        to: 'TAfbit1ENsRmtZbPQfYU3srURpfYuWYS7K',
        value: '0',
        chainSpecific: {
          from: FROM,
          contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
          data: '0x2213bc0b',
        },
      })
      expect(actual.unwrap()).toEqual({
        orderId: 'order-1',
        transactionData: {
          type: 'tron',
          to: 'TAfbit1ENsRmtZbPQfYU3srURpfYuWYS7K',
          data: '0x2213bc0b',
          value: '0',
        },
        networkFeeCryptoBaseUnit: '45600000',
      })
    })

    it('fails the quote when the simulation reverts', async () => {
      vi.mocked(createBobGatewayOrder).mockResolvedValue(
        Ok({ offramp: { orderId: 'order-1', tx: tronTx } }) as any,
      )
      const adapter = tronAdapter()
      adapter.getFeeData.mockRejectedValue(new Error('REVERT opcode executed'))

      const actual = await getBobGatewayStepData({
        type: 'quote',
        input: {} as GetTradeQuoteInput,
        deps: makeDeps(adapter),
        quote,
        sellAsset: USDT_TRON,
        sellAmountCryptoBaseUnit: '100000000',
        spenderAddress: '',
        from: FROM,
      })

      expect(actual.isErr()).toBe(true)
    })
  })
})
