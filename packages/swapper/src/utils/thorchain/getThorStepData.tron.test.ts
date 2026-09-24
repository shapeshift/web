import { tronChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { describe, expect, it, vi } from 'vitest'

import type { GetTradeQuoteInput, GetTradeRateInput, SwapperDeps } from '../../types'
import { SwapperName } from '../../types'
import { ETH } from '../test-data/assets'
import { getThorStepData } from './getThorStepData'
import { TradeType } from './types'

vi.mock('./getThorTxData', () => ({
  getThorTxData: vi.fn().mockResolvedValue({ vault: 'TVault' }),
  getThorRouterAndVault: vi.fn(),
}))

const USDT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
const USDT_TRON: Asset = { ...ETH, assetId: `${tronChainId}/trc20:${USDT}`, chainId: tronChainId }
const FROM = 'TT2T17KZhoDu47i2E4FWxfG79zdkEWkU9N'

const tronAdapter = (txFee = '9000000') => ({
  getFeeData: vi.fn().mockResolvedValue({ fast: { txFee } }),
})

const makeDeps = (tron: ReturnType<typeof tronAdapter>): SwapperDeps =>
  ({ config: {}, assertGetTronChainAdapter: () => tron }) as unknown as SwapperDeps

const baseArgs = {
  swapperName: SwapperName.Thorchain,
  tradeType: TradeType.L1ToL1,
  sellAsset: USDT_TRON,
  sellAmountCryptoBaseUnit: '100000000',
  expiry: 0,
  rawMemo: '=:ETH.ETH:0xabc:1',
}

describe('getThorStepData tron', () => {
  it('carries the vault transfer as transactionData and estimates it for a quote', async () => {
    const adapter = tronAdapter()

    const actual = await getThorStepData({
      ...baseArgs,
      type: 'quote',
      input: {} as GetTradeQuoteInput,
      deps: makeDeps(adapter),
      from: FROM,
      memo: '=:ETH.ETH:0xabc:1/1/0:ss:55',
    })

    expect(actual.unwrap()).toEqual({
      transactionData: {
        type: 'tron',
        to: 'TVault',
        value: '100000000',
        memo: '=:ETH.ETH:0xabc:1/1/0:ss:55',
      },
      networkFeeCryptoBaseUnit: '9000000',
    })
    expect(adapter.getFeeData).toHaveBeenCalledWith({
      to: 'TVault',
      value: '100000000',
      chainSpecific: { from: FROM, contractAddress: USDT, memo: '=:ETH.ETH:0xabc:1/1/0:ss:55' },
    })
  })

  it('fails the quote when estimation fails', async () => {
    const adapter = tronAdapter()
    adapter.getFeeData.mockRejectedValue(new Error('rpc down'))

    const actual = await getThorStepData({
      ...baseArgs,
      type: 'quote',
      input: {} as GetTradeQuoteInput,
      deps: makeDeps(adapter),
      from: FROM,
      memo: '=:ETH.ETH:0xabc:1/1/0:ss:55',
    })

    expect(actual.isErr()).toBe(true)
  })

  it('sizes a rate with the raw memo and no sender', async () => {
    const adapter = tronAdapter()

    const actual = await getThorStepData({
      ...baseArgs,
      type: 'rate',
      input: {} as GetTradeRateInput,
      deps: makeDeps(adapter),
      memo: '',
    })

    expect(actual.unwrap()).toEqual({ networkFeeCryptoBaseUnit: '9000000' })
    expect(adapter.getFeeData).toHaveBeenCalledWith({
      to: 'TVault',
      value: '100000000',
      chainSpecific: { from: undefined, contractAddress: USDT, memo: '=:ETH.ETH:0xabc:1' },
    })
  })
})
