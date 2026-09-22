import { tronChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { describe, expect, it, vi } from 'vitest'

import type { GetTradeQuoteInput, GetTradeRateInput, SwapperDeps } from '../../../types'
import { ETH } from '../../../utils/test-data/assets'
import { getRelayStepData } from './getRelayStepData'
import type { RelayQuoteTronItemData } from './types'

const TRX: Asset = { ...ETH, assetId: `${tronChainId}/slip44:195`, chainId: tronChainId }
const FROM = 'TT2T17KZhoDu47i2E4FWxfG79zdkEWkU9N'
// relay's tron depositor, as relay returns it (41-prefixed hex)
const DEPOSITOR_HEX = '41f0623e1012177482912fb057e44e1a9769b1f5c2'
const DEPOSITOR = 'TXtEs6t2oUWQsNos7m68gbHdE9QCMoqLm5'

const tronItem: RelayQuoteTronItemData = {
  type: 'TriggerSmartContract',
  parameter: { contract_address: DEPOSITOR_HEX, data: '49290c1c', call_value: 50000000 },
}

const tronAdapter = (txFee = '9000000') => ({
  getFeeData: vi.fn().mockResolvedValue({ fast: { txFee } }),
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

      const transactionData = { type: 'tron', to: DEPOSITOR, data: '49290c1c', value: '50000000' }

      expect(actual.unwrap()).toEqual({ transactionData, networkFeeCryptoBaseUnit: '9000000' })
      expect(adapter.getFeeData).toHaveBeenCalledWith({
        to: DEPOSITOR,
        value: '50000000',
        chainSpecific: { from: FROM, data: '49290c1c' },
      })
    })

    it('falls back to the relay fee when simulation fails', async () => {
      const adapter = tronAdapter()
      adapter.getFeeData.mockRejectedValue(new Error('REVERT opcode executed'))

      const actual = await getRelayStepData({
        ...baseArgs,
        type: 'quote',
        input: {} as GetTradeQuoteInput,
        from: FROM,
        deps: makeDeps(adapter),
      })

      expect(actual.unwrap().networkFeeCryptoBaseUnit).toBe('6100715')
    })

    it('prices a rate from the relay fee', async () => {
      const actual = await getRelayStepData({
        ...baseArgs,
        type: 'rate',
        input: {} as GetTradeRateInput,
        from: FROM,
        deps: makeDeps(tronAdapter()),
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
