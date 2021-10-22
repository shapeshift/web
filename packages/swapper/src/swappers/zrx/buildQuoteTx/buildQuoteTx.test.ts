import BigNumber from 'bignumber.js'
import { ChainAdapterManager } from '@shapeshiftoss/chain-adapters'
import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import Web3 from 'web3'
import { buildQuoteTx } from './buildQuoteTx'
import { setupQuote } from '../utils/test-data/setupSwapQuote'
import { zrxService } from '../utils/zrxService'
import { APPROVAL_GAS_LIMIT, MAX_SLIPPAGE, DEFAULT_SLIPPAGE } from '../utils/constants'
import { ChainTypes, GetQuoteInput } from '@shapeshiftoss/types'

jest.mock('web3')

jest.mock('axios', () => {
  return {
    create: () => {
      return {
        interceptors: {
          request: { eject: jest.fn(), use: jest.fn() },
          response: { eject: jest.fn(), use: jest.fn() }
        },
        get: jest.fn()
      }
    }
  }
})

// @ts-ignore
Web3.mockImplementation(() => ({
  eth: {
    Contract: jest.fn(() => ({
      methods: {
        allowance: jest.fn(() => ({
          call: jest.fn()
        }))
      }
    }))
  }
}))

const mockQuoteResponse = {
  allowanceContract: undefined,
  allowanceGrantRequired: true,
  buyAmount: undefined,
  buyAsset: {
    chain: 'ethereum',
    color: '#FFFFFF',
    contractType: 'ERC20',
    explorer: 'https://etherscan.io',
    explorerTxLink: 'https://etherscan.io/tx/',
    icon: 'https://assets.coingecko.com/coins/images/2518/thumb/weth.png?1628852295',
    name: 'WETH',
    network: 'MAINNET',
    precision: 18,
    slip44: 60,
    receiveSupport: true,
    secondaryColor: '#FFFFFF',
    sendSupport: true,
    symbol: 'WETH',
    tokenId: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
  },
  buyAssetAccountId: '0',
  depositAddress: undefined,
  feeData: {
    fee: '0',
    chainSpecific: {
      approvalFee: '0',
      estimatedGas: '0',
      gasPrice: undefined
    }
  },
  guaranteedPrice: undefined,
  priceImpact: undefined,
  rate: undefined,
  receiveAddress: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
  sellAmount: '1000000000000000000',
  sellAsset: {
    chain: 'ethereum',
    color: '#FFFFFF',
    contractType: 'ERC20',
    icon: 'https://assets.coincap.io/assets/icons/fox@2x.png',
    name: 'FOX',
    slip44: 60,
    explorer: 'https://etherscan.io',
    explorerTxLink: 'https://etherscan.io/tx/',
    network: 'MAINNET',
    precision: 18,
    receiveSupport: true,
    secondaryColor: '#FFFFFF',
    sendSupport: true,
    symbol: 'FOX',
    tokenId: '0xc770eefad204b5180df6a14ee197d99d808ee52d'
  },
  sellAssetAccountId: '0',
  slippage: DEFAULT_SLIPPAGE,
  sources: [{ name: '0x', proportion: '1' }],
  statusCode: 0,
  success: true,
  txData: undefined
}

const setup = () => {
  const unchainedUrls = {
    [ChainTypes.Ethereum]: {
      httpUrl: 'http://localhost:31300',
      wsUrl: 'ws://localhost:31300'
    }
  }
  const ethNodeUrl = 'http://localhost:1000'
  const adapterManager = new ChainAdapterManager(unchainedUrls)
  const web3Provider = new Web3.providers.HttpProvider(ethNodeUrl)
  const web3Instance = new Web3(web3Provider)

  return { web3Instance, adapterManager }
}

describe('buildQuoteTx', () => {
  const { quoteInput, sellAsset, buyAsset } = setupQuote()
  const { web3Instance, adapterManager } = setup()
  const walletAddress = '0xc770eefad204b5180df6a14ee197d99d808ee52d'
  const wallet = ({
    ethGetAddress: jest.fn(() => Promise.resolve(walletAddress))
  } as unknown) as HDWallet
  const deps = {
    adapterManager,
    web3: web3Instance
  }

  it('should throw error if sellAmount AND buyAmount is provided', async () => {
    const input = { ...quoteInput, buyAmount: '1234.12', sellAmount: '1234.12' }

    await expect(buildQuoteTx(deps, { input, wallet })).rejects.toThrow(
      'ZrxSwapper:buildQuoteTx Exactly one of buyAmount or sellAmount is required'
    )
  })

  it('should throw error if sellAmount AND buyAmount are NOT provided', async () => {
    const input = { ...quoteInput, sellAmount: '', buyAmount: '' }

    await expect(buildQuoteTx(deps, { input, wallet })).rejects.toThrow(
      'ZrxSwapper:buildQuoteTx Exactly one of buyAmount or sellAmount is required'
    )
  })

  it('should throw error if sellAssetAccountId is NOT provided', async () => {
    const input = { ...quoteInput, sellAssetAccountId: '' }

    await expect(buildQuoteTx(deps, { input, wallet })).rejects.toThrow(
      'ZrxSwapper:buildQuoteTx Both sellAssetAccountId and buyAssetAccountId are required'
    )
  })

  it('should throw error if buyAssetAccountId is NOT provided', async () => {
    const input = { ...quoteInput, buyAssetAccountId: '' }

    await expect(buildQuoteTx(deps, { input, wallet })).rejects.toThrow(
      'ZrxSwapper:buildQuoteTx Both sellAssetAccountId and buyAssetAccountId are required'
    )
  })

  it('should throw error if slippage is higher than MAX_SLIPPAGE', async () => {
    const slippage = '31.0'
    const input = { ...quoteInput, slippage }

    await expect(buildQuoteTx(deps, { input, wallet })).rejects.toThrow(
      `ZrxSwapper:buildQuoteTx slippage value of ${slippage} is greater than max slippage value of ${MAX_SLIPPAGE}`
    )
  })

  it('should throw error if tokenId, symbol and network are not provided for buyAsset', async () => {
    const input = ({
      ...quoteInput,
      buyAsset: {
        ...buyAsset,
        tokenId: '',
        symbol: '',
        network: ''
      }
    } as unknown) as GetQuoteInput

    await expect(buildQuoteTx(deps, { input, wallet })).rejects.toThrow(
      'ZrxSwapper:buildQuoteTx One of buyAssetContract or buyAssetSymbol or buyAssetNetwork are required'
    )
  })

  it('should throw error if tokenId, symbol and network are not provided for sellAsset', async () => {
    const input = ({
      ...quoteInput,
      sellAsset: {
        ...sellAsset,
        tokenId: '',
        symbol: '',
        network: ''
      }
    } as unknown) as GetQuoteInput

    await expect(buildQuoteTx(deps, { input, wallet })).rejects.toThrow(
      'ZrxSwapper:buildQuoteTx One of sellAssetContract or sellAssetSymbol or sellAssetNetwork are required'
    )
  })

  it('should return a quote response', async () => {
    const allowanceOnChain = '1000'
    const data = {
      ...quoteInput
    }
    ;(web3Instance.eth.Contract as jest.Mock<unknown>).mockImplementation(() => ({
      methods: {
        allowance: jest.fn(() => ({
          call: jest.fn(() => allowanceOnChain)
        }))
      }
    }))
    ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(Promise.resolve({ data }))

    expect(await buildQuoteTx(deps, { input: quoteInput, wallet })).toEqual(mockQuoteResponse)
  })

  it('should return a quote response with rate when price is given', async () => {
    const allowanceOnChain = '1000'
    const price = '1000'
    const data = {
      ...quoteInput,
      price
    }
    ;(web3Instance.eth.Contract as jest.Mock<unknown>).mockImplementation(() => ({
      methods: {
        allowance: jest.fn(() => ({
          call: jest.fn(() => allowanceOnChain)
        }))
      }
    }))
    ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(Promise.resolve({ data }))

    expect(await buildQuoteTx(deps, { input: quoteInput, wallet })).toEqual({
      ...mockQuoteResponse,
      rate: price
    })
  })

  it('should return a quote response with gasPrice multiplied by estimatedGas', async () => {
    const gasPrice = '10000'
    const estimatedGas = '100'
    const data = {
      ...quoteInput,
      gas: estimatedGas,
      gasPrice
    }
    ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(Promise.resolve({ data }))

    expect(await buildQuoteTx(deps, { input: quoteInput, wallet })).toEqual({
      ...mockQuoteResponse,
      feeData: {
        ...mockQuoteResponse.feeData,
        chainSpecific: {
          approvalFee: new BigNumber(APPROVAL_GAS_LIMIT).multipliedBy(gasPrice).toString(),
          gasPrice,
          estimatedGas
        },
        fee: new BigNumber(gasPrice).multipliedBy(estimatedGas).toString()
      }
    })
  })

  it('should return a quote response with allowanceContract when allowanceTarget is provided', async () => {
    const allowanceTarget = '100'
    const data = {
      ...quoteInput,
      allowanceTarget
    }
    ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(Promise.resolve({ data }))

    expect(await buildQuoteTx(deps, { input: quoteInput, wallet })).toEqual({
      ...mockQuoteResponse,
      allowanceContract: allowanceTarget
    })
  })

  it('should throw on api error status of 400', async () => {
    ;(zrxService.get as jest.Mock<unknown>).mockImplementation(() =>
      Promise.reject({ response: { data: { code: 400 } } })
    )

    expect(await buildQuoteTx(deps, { input: quoteInput, wallet })).toEqual({
      success: false,
      statusCode: 400,
      statusReason: 'Unknown Error',
      buyAsset: { ...mockQuoteResponse.buyAsset },
      sellAsset: { ...mockQuoteResponse.sellAsset }
    })
  })

  it('should throw on api error status of 500', async () => {
    ;(zrxService.get as jest.Mock<unknown>).mockImplementation(() =>
      Promise.reject({ response: { data: { code: 500 } } })
    )

    expect(await buildQuoteTx(deps, { input: quoteInput, wallet })).toEqual({
      success: false,
      statusCode: 500,
      statusReason: 'Unknown Error',
      buyAsset: { ...mockQuoteResponse.buyAsset },
      sellAsset: { ...mockQuoteResponse.sellAsset }
    })
  })
})
