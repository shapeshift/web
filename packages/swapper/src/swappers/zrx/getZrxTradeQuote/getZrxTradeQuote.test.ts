import { ChainAdapterManager } from '@shapeshiftoss/chain-adapters'
import Web3 from 'web3'

import { ZrxSwapper } from '../..'
import { bn, bnOrZero } from '../utils/bignumber'
import { normalizeAmount } from '../utils/helpers/helpers'
import { setupQuote } from '../utils/test-data/setupSwapQuote'
import { zrxService } from '../utils/zrxService'

const axios = jest.createMockFromModule('axios')
//@ts-ignore
axios.create = jest.fn(() => axios)
jest.mock('../utils/helpers/helpers')
jest.mock('../utils/zrxService')

describe('getZrxTradeQuote', () => {
  const sellAmount = '1000000000000000000'
  ;(normalizeAmount as jest.Mock<unknown>).mockReturnValue(sellAmount)
  const zrxSwapperDeps = {
    web3: <Web3>{},
    adapterManager: <ChainAdapterManager>{}
  }
  it('returns quote with fee data', async () => {
    const { quoteInput } = setupQuote()
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve({
        data: { success: true, price: '100', gasPrice: '1000', estimatedGas: '1000000' }
      })
    )
    const quote = await swapper.getTradeQuote(quoteInput)
    expect(quote.success).toBeTruthy()
    expect(quote.feeData).toStrictEqual({
      fee: '1500000000',
      chainSpecific: {
        estimatedGas: '1500000',
        gasPrice: '1000',
        approvalFee: '100000000'
      }
    })
    expect(quote.rate).toBe('100')
  })
  it('quote fails with a bad zrx response with no error indicated', async () => {
    const { quoteInput } = setupQuote()
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(Promise.resolve(undefined))
    await expect(
      swapper.getTradeQuote({
        ...quoteInput
      })
    ).rejects.toThrow('[getZrxTradeQuote]')
  })
  it('quote fails with on errored zrx response', async () => {
    const { quoteInput } = setupQuote()
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    ;(zrxService.get as jest.Mock<unknown>).mockRejectedValue({
      response: { data: { code: 502, reason: 'Failed to do some stuff' } }
    } as never)

    await expect(
      swapper.getTradeQuote({
        ...quoteInput
      })
    ).rejects.toThrow('[getZrxTradeQuote]')
  })
  it('returns quote without fee data', async () => {
    const { quoteInput } = setupQuote()
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve({
        data: { success: true, price: '100' }
      })
    )
    const quote = await swapper.getTradeQuote(quoteInput)
    expect(quote?.success).toBeTruthy()
    expect(quote?.feeData).toStrictEqual({
      fee: '0',
      chainSpecific: {
        estimatedGas: '0',
        approvalFee: '0',
        gasPrice: undefined
      }
    })
  })
  it('fails on non ethereum chain for buyAsset', async () => {
    const { quoteInput, buyAsset } = setupQuote()
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve({ data: { success: false } })
    )
    await expect(
      swapper.getTradeQuote({
        ...quoteInput,
        buyAsset: { ...buyAsset, chainId: 'bip122:000000000019d6689c085ae165831e93' }
      })
    ).rejects.toThrow('[getZrxTradeQuote]')
  })
  it('fails on non ethereum chain for sellAsset', async () => {
    const { quoteInput, sellAsset } = setupQuote()
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve({ data: { success: false } })
    )
    await expect(
      swapper.getTradeQuote({
        ...quoteInput,
        sellAsset: { ...sellAsset, chainId: 'bip122:000000000019d6689c085ae165831e93' }
      })
    ).rejects.toThrow('[getZrxTradeQuote]')
  })
  it('use minQuoteSellAmount when sellAmount is 0', async () => {
    const { quoteInput, sellAsset } = setupQuote()
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve({ data: { sellAmount: '20000000000000000000' } })
    )
    const minimum = '20'
    const quote = await swapper.getTradeQuote({
      ...quoteInput,
      sellAmount: '0'
    })
    expect(quote?.sellAmount).toBe(
      bnOrZero(minimum).times(bn(10).exponentiatedBy(sellAsset.precision)).toString()
    )
  })
})
