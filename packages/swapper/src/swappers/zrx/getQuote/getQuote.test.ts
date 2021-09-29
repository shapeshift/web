import { ChainTypes, ContractTypes, NetworkTypes, Asset } from '@shapeshiftoss/asset-service'
import { ChainAdapterManager } from '@shapeshiftoss/chain-adapters'
import Web3 from 'web3'
import BigNumber from 'bignumber.js'
import { ZrxSwapper } from '../..'
import { DEFAULT_SLIPPAGE } from '../utils/constants'
import { zrxService } from '../utils/zrxService'
import { normalizeAmount } from '../utils/helpers/helpers'

const axios = jest.createMockFromModule('axios')
//@ts-ignore
axios.create = jest.fn(() => axios)
jest.mock('../utils/helpers/helpers')
jest.mock('../utils/zrxService')

const setupQuote = () => {
  const sellAmount = '1000000000000000000'
  ;(normalizeAmount as jest.Mock<unknown>).mockReturnValue(sellAmount)
  const sellAsset = ({
    name: 'Fox',
    chain: ChainTypes.Ethereum,
    network: NetworkTypes.MAINNET,
    precision: 18,
    tokenId: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
    contractType: ContractTypes.ERC20,
    color: '#FFFFFF',
    secondaryColor: '#FFFFFF',
    icon: 'https://assets.coincap.io/assets/icons/fox@2x.png',
    slip44: 60,
    explorer: 'https://etherscan.io',
    explorerTxLink: 'https://etherscan.io/tx/',
    sendSupport: true,
    receiveSupport: true,
    symbol: 'FOX'
    // TODO: remove the type casts from test files when we unify `ChainTypes` and `ChainIdentifier`
  } as unknown) as Asset
  const buyAsset = ({
    name: 'WETH',
    chain: ChainTypes.Ethereum,
    network: NetworkTypes.MAINNET,
    precision: 18,
    tokenId: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    contractType: ContractTypes.ERC20,
    color: '#FFFFFF',
    secondaryColor: '#FFFFFF',
    icon: 'https://assets.coingecko.com/coins/images/2518/thumb/weth.png?1628852295',
    slip44: 60,
    explorer: 'https://etherscan.io',
    explorerTxLink: 'https://etherscan.io/tx/',
    sendSupport: true,
    receiveSupport: true,
    symbol: 'WETH'
  } as unknown) as Asset

  const quoteInput = {
    sellAsset,
    buyAsset,
    sellAmount,
    slippage: DEFAULT_SLIPPAGE
  }
  return { quoteInput, buyAsset, sellAsset }
}

describe('getZrxQuote', () => {
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
      estimatedGas: '1500000',
      gasPrice: '1000',
      approvalFee: '100000000'
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
      estimatedGas: '0',
      approvalFee: '0',
      gasPrice: undefined
    })
  })
  it('fails on no sellAmount', async () => {
    const { quoteInput } = setupQuote()
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    await expect(swapper.getQuote({ ...quoteInput, sellAmount: undefined })).rejects.toThrow(
      'ZrxError:getQuote - sellAmount is required'
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
