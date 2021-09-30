import Web3 from 'web3'
import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { ChainAdapterManager } from '@shapeshiftoss/chain-adapters'
import {
  ChainTypes,
  NetworkTypes,
  ContractTypes,
  GetQuoteInput,
  SwapperType
} from '@shapeshiftoss/types'
import { ZrxSwapper } from '..'
import { ZrxError } from '../..'
import { DEFAULT_SLIPPAGE } from './utils/constants'
import { buildQuoteTx } from '../zrx/buildQuoteTx/buildQuoteTx'
import { getZrxQuote } from './getQuote/getQuote'
import { zrxService } from './utils/zrxService'

const axios = jest.createMockFromModule('axios')
//@ts-ignore
axios.create = jest.fn(() => axios)
jest.mock('./utils/helpers/helpers')
jest.mock('./utils/zrxService')
jest.mock('../zrx/buildQuoteTx/buildQuoteTx', () => ({
  buildQuoteTx: jest.fn()
}))

jest.mock('./getQuote/getQuote', () => ({
  getZrxQuote: jest.fn()
}))

const BTC = {
  name: 'bitcoin',
  chain: ChainTypes.Bitcoin,
  network: NetworkTypes.MAINNET,
  precision: 8,
  slip44: 0,
  contractType: ContractTypes.ERC20,
  color: '#FFFFFF',
  secondaryColor: '#FFFFFF',
  icon: 'https://assets.coincap.io/assets/icons/btc@2x.png',
  explorer: 'https://live.blockcypher.com',
  explorerTxLink: 'https://live.blockcypher.com/btc/tx/',
  sendSupport: false,
  receiveSupport: false,
  symbol: 'BTC'
}
const WETH = {
  name: 'WETH',
  chain: ChainTypes.Ethereum,
  network: NetworkTypes.MAINNET,
  precision: 18,
  tokenId: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  contractType: ContractTypes.ERC20,
  color: '#FFFFFF',
  secondaryColor: '#FFFFFF',
  icon: 'https://assets.coingecko.com/coins/images/2518/thumb/weth.png?1628852295',
  slip44: 0,
  explorer: 'https://etherscan.io',
  explorerTxLink: 'https://etherscan.io/tx/',
  sendSupport: true,
  receiveSupport: true,
  symbol: 'WETH'
}
const FOX = {
  name: 'Fox',
  chain: ChainTypes.Ethereum,
  network: NetworkTypes.MAINNET,
  precision: 18,
  tokenId: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
  contractType: ContractTypes.ERC20,
  color: '#FFFFFF',
  secondaryColor: '#FFFFFF',
  icon: 'https://assets.coincap.io/assets/icons/fox@2x.png',
  sendSupport: true,
  slip44: 0,
  explorer: 'https://etherscan.io',
  explorerTxLink: 'https://etherscan.io/tx/',
  receiveSupport: true,
  symbol: 'FOX'
}

const setupQuote = () => {
  const sellAmount = '1000000000000000000'
  const sellAsset = FOX
  const buyAsset = WETH

  const quoteInput = {
    sellAsset,
    buyAsset,
    sellAmount,
    slippage: DEFAULT_SLIPPAGE
  }
  return { quoteInput, buyAsset, sellAsset }
}

describe('ZrxSwapper', () => {
  const input = <GetQuoteInput>{}
  const wallet = <HDWallet>{}
  const web3 = <Web3>{}
  const adapterManager = <ChainAdapterManager>{}
  const zrxSwapperDeps = { web3, adapterManager }

  it('calls getZrxQuote on getQuote', async () => {
    const { quoteInput } = setupQuote()
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    await swapper.getQuote(quoteInput)
    expect(getZrxQuote).toHaveBeenCalled()
  })
  it('returns Zrx type', () => {
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    const type = swapper.getType()
    expect(type).toBe(SwapperType.Zrx)
  })
  it('handles ZrxError message', () => {
    const message = 'test error'
    const error = new ZrxError(message)
    expect(error.message).toBe(`ZrxError:${message}`)
  })
  it('getAvailableAssets filters out all non-ethereum assets', () => {
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    const availableAssets = swapper.getAvailableAssets([BTC, FOX, WETH])
    expect(availableAssets).toStrictEqual([FOX, WETH])
  })
  it('canTradePair fails on non-eth chains', () => {
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    const canTradePair = swapper.canTradePair(BTC, WETH)
    expect(canTradePair).toBeFalsy()
  })
  it('canTradePair succeeds on eth chains', () => {
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    const canTradePair = swapper.canTradePair(FOX, WETH)
    expect(canTradePair).toBeTruthy()
  })
  it('calls buildQuoteTx on swapper.buildQuoteTx', async () => {
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    const args = { input, wallet }
    await swapper.buildQuoteTx(args)
    expect(buildQuoteTx).toHaveBeenCalled()
  })
  describe('getUsdRate', () => {
    it('getUsdRate gets the usd rate of the symbol', async () => {
      const swapper = new ZrxSwapper(zrxSwapperDeps)
      ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(
        Promise.resolve({ data: { price: '2' } })
      )
      const rate = await swapper.getUsdRate({ symbol: 'FOX' })
      expect(rate).toBe('0.5')
    })
    it('getUsdRate fails', async () => {
      const swapper = new ZrxSwapper(zrxSwapperDeps)
      ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(Promise.resolve({ data: {} }))
      await expect(swapper.getUsdRate({ symbol: 'WETH', tokenId: '0x0001' })).rejects.toThrow(
        'getUsdRate - Failed to get price data'
      )
    })
  })
})
