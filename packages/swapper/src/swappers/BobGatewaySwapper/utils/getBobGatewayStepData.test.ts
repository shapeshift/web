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

const tronAdapter = ({ txFee = '45600000', allowance = '0' } = {}) => ({
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
  ({ config: {}, assertGetTronChainAdapter: () => tron }) as unknown as SwapperDeps

const quote = {} as GatewayQuoteV4

describe('getBobGatewayStepData', () => {
  describe('tron', () => {
    it('prices a rate from the measured default energy and bandwidth at the gateway share', async () => {
      const adapter = tronAdapter()
      const actual = await getBobGatewayStepData({
        type: 'rate',
        input: {} as GetTradeRateInput,
        deps: makeDeps(adapter),
        quote,
        sellAsset: USDT_TRON,
        sellAmountCryptoBaseUnit: '100000000',
        spenderAddress: 'TAfbit1ENsRmtZbPQfYU3srURpfYuWYS7K',
      })

      // 420000 energy * 1.2 margin * 100 sun + 4000 bytes * 1000 sun
      expect(actual.unwrap()).toEqual({ networkFeeCryptoBaseUnit: '54400000' })
      expect(adapter.httpProvider.getContractEnergyShare).toHaveBeenCalledWith(
        'TAfbit1ENsRmtZbPQfYU3srURpfYuWYS7K',
      )
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
        to: ALLOWANCE_HOLDER_HEX,
        value: '0',
        chainSpecific: { from: FROM, data: '0x2213bc0b', requireEnergyShare: true },
      })
      expect(actual.unwrap()).toEqual({
        orderId: 'order-1',
        transactionData: { type: 'tron', to: ALLOWANCE_HOLDER_HEX, data: '0x2213bc0b', value: '0' },
        networkFeeCryptoBaseUnit: '45600000',
      })
    })

    it('prices the measured worst case when the allowance is not granted yet', async () => {
      vi.mocked(createBobGatewayOrder).mockResolvedValue(
        Ok({ offramp: { orderId: 'order-1', tx: tronTx } }) as any,
      )
      const adapter = tronAdapter({ allowance: '0' })
      adapter.getFeeData.mockRejectedValue(new Error('REVERT opcode executed'))

      const actual = await getBobGatewayStepData({
        type: 'quote',
        input: {} as GetTradeQuoteInput,
        deps: makeDeps(adapter),
        quote,
        sellAsset: USDT_TRON,
        sellAmountCryptoBaseUnit: '100000000',
        spenderAddress: 'TAfbit1ENsRmtZbPQfYU3srURpfYuWYS7K',
        from: FROM,
      })

      // 420000 energy * 1.2 margin * 100 sun + (4 calldata + 279 envelope) bytes * 1000 sun
      expect(actual.unwrap()).toMatchObject({
        orderId: 'order-1',
        networkFeeCryptoBaseUnit: '50683000',
      })
      expect(adapter.httpProvider.getTrc20Allowance).toHaveBeenCalledWith({
        contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        owner: FROM,
        spender: 'TAfbit1ENsRmtZbPQfYU3srURpfYuWYS7K',
      })
    })

    it('fails the quote when the simulation reverts with the allowance in place', async () => {
      vi.mocked(createBobGatewayOrder).mockResolvedValue(
        Ok({ offramp: { orderId: 'order-1', tx: tronTx } }) as any,
      )
      const adapter = tronAdapter({ allowance: '100000000' })
      adapter.getFeeData.mockRejectedValue(new Error('REVERT opcode executed'))

      const actual = await getBobGatewayStepData({
        type: 'quote',
        input: {} as GetTradeQuoteInput,
        deps: makeDeps(adapter),
        quote,
        sellAsset: USDT_TRON,
        sellAmountCryptoBaseUnit: '100000000',
        spenderAddress: 'TAfbit1ENsRmtZbPQfYU3srURpfYuWYS7K',
        from: FROM,
      })

      expect(actual.isErr()).toBe(true)
    })
  })
})
