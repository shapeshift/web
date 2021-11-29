import { ChainAdapterManager } from '@shapeshiftoss/chain-adapters'
import { ChainTypes } from '@shapeshiftoss/types'
import BigNumber from 'bignumber.js'
import Web3 from 'web3'

import { ZrxSwapper } from '../..'
import { normalizeAmount } from '../utils/helpers/helpers'
import { setupQuote } from '../utils/test-data/setupSwapQuote'
import { zrxService } from '../utils/zrxService'

const axios = jest.createMockFromModule('axios')
//@ts-ignore
axios.create = jest.fn(() => axios)
jest.mock('../utils/helpers/helpers')
jest.mock('../utils/zrxService')

describe('getZrxQuote', () => {
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
    const quote = await swapper.getQuote(quoteInput)
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
  it('quote fails with no error message', async () => {
    const { quoteInput } = setupQuote()
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(Promise.resolve(undefined))
    const quote = await swapper.getQuote(quoteInput)
    expect(quote.statusCode).toBe(-1)
    expect(quote.success).toBe(false)
    expect(quote.statusReason).toBe('Unknown Error')
  })
  it('quote fails with validation error message', async () => {
    const { quoteInput } = setupQuote()
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    ;(zrxService.get as jest.Mock<unknown>).mockRejectedValue({
      response: { data: { code: 502, reason: 'Failed to do some stuff' } }
    } as never)
    const quote = await swapper.getQuote(quoteInput)
    expect(quote.statusCode).toBe(502)
    expect(quote.success).toBe(false)
    expect(quote.statusReason).toBe('Failed to do some stuff')
  })
  it('returns quote without fee data', async () => {
    const { quoteInput } = setupQuote()
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve({
        data: { success: true, price: '100' }
      })
    )
    const quote = await swapper.getQuote(quoteInput)
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
  it('fails on no sellAmount or buyAmount', async () => {
    const { quoteInput } = setupQuote()
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    await expect(swapper.getQuote({ ...quoteInput, sellAmount: undefined })).rejects.toThrow(
      'ZrxError:getQuote - sellAmount or buyAmount amount is required'
    )
  })
  it('slippage is undefined', async () => {
    const { quoteInput } = setupQuote()
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve({ data: { success: true } })
    )
    const quote = await swapper.getQuote({ ...quoteInput, slippage: undefined })
    expect(quote?.slippage).toBeFalsy()
  })
  it('fails on non ethereum chain for buyAsset', async () => {
    const { quoteInput, buyAsset } = setupQuote()
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve({ data: { success: false } })
    )
    await expect(
      swapper.getQuote({
        ...quoteInput,
        buyAsset: { ...buyAsset, chain: ChainTypes.Bitcoin }
      })
    ).rejects.toThrow('ZrxError:getQuote - Both assets need to be on the Ethereum chain to use Zrx')
  })
  it('fails on non ethereum chain for sellAsset', async () => {
    const { quoteInput, sellAsset } = setupQuote()
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve({ data: { success: false } })
    )
    await expect(
      swapper.getQuote({
        ...quoteInput,
        sellAsset: { ...sellAsset, chain: ChainTypes.Bitcoin }
      })
    ).rejects.toThrow('ZrxError:getQuote - Both assets need to be on the Ethereum chain to use Zrx')
  })
  it('uses symbol when weth tokenId is undefined', async () => {
    const { quoteInput, buyAsset } = setupQuote()
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve({ data: { success: true } })
    )
    const quote = await swapper.getQuote({
      ...quoteInput,
      buyAsset: { ...buyAsset, tokenId: undefined }
    })
    expect(quote?.success).toBeTruthy()
    expect(quote?.buyAsset.tokenId).toBeFalsy()
  })
  it('uses symbol when fox tokenId is undefined', async () => {
    const { quoteInput, sellAsset } = setupQuote()
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve({ data: { success: true } })
    )
    const quote = await swapper.getQuote({
      ...quoteInput,
      sellAsset: { ...sellAsset, tokenId: undefined }
    })
    expect(quote?.success).toBeTruthy()
    expect(quote?.sellAsset.tokenId).toBeFalsy()
  })
  it('use minQuoteSellAmount when sellAmount is 0', async () => {
    const { quoteInput, sellAsset } = setupQuote()
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve({ data: { sellAmount: '20000000000000000000' } })
    )
    const minimum = '20'
    const quote = await swapper.getQuote({
      ...quoteInput,
      sellAmount: '0',
      minimum
    })
    expect(quote?.sellAmount).toBe(
      new BigNumber(minimum)
        .times(new BigNumber(10).exponentiatedBy(sellAsset.precision))
        .toString()
    )
  })
  it('normalizedAmount returns undefined when amount is 0', async () => {
    const { quoteInput } = setupQuote()
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    const quote = await swapper.getQuote({
      ...quoteInput,
      sellAmount: '0',
      minimum: undefined
    })
    expect(quote?.minimum).toBe(undefined)
  })
})
