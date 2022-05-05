import { ChainAdapterManager } from '@shapeshiftoss/chain-adapters'
import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { ChainTypes } from '@shapeshiftoss/types'
import Web3 from 'web3'

import { BuildTradeInput } from '../../../api'
import { bnOrZero } from '../utils/bignumber'
import { APPROVAL_GAS_LIMIT, MAX_SLIPPAGE } from '../utils/constants'
import { setupZrxQuoteResponse } from '../utils/test-data/setupSwapQuote'
import { zrxService } from '../utils/zrxService'
import { zrxBuildTrade } from './zrxBuildTrade'
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

describe('ZrxBuildTrade', () => {
  const { quoteResponse, sellAsset, buyAsset } = setupZrxQuoteResponse()
  const { web3Instance, adapterManager } = setup()
  const walletAddress = '0xc770eefad204b5180df6a14ee197d99d808ee52d'
  const wallet = {
    ethGetAddress: jest.fn(() => Promise.resolve(walletAddress))
  } as unknown as HDWallet
  const deps = {
    adapterManager,
    web3: web3Instance
  }

  const buildTradeInput: BuildTradeInput = {
    sendMax: false,
    sellAsset,
    buyAsset,
    buyAmount: '',
    sellAmount: '1000000000000000000',
    sellAssetAccountId: '0',
    buyAssetAccountId: '0',
    wallet
  }

  const buildTradeResponse = {
    sellAsset,
    success: true,
    statusReason: '',
    sellAmount: quoteResponse.sellAmount,
    buyAmount: '',
    depositAddress: quoteResponse.to,
    allowanceContract: 'allowanceTargetAddress',
    receiveAddress: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
    sellAssetAccountId: '0',
    txData: quoteResponse.data,
    rate: quoteResponse.price,
    feeData: {
      fee: (Number(quoteResponse.gas) * Number(quoteResponse.gasPrice)).toString(),
      chainSpecific: { approvalFee: '123600000', estimatedGas: '1235', gasPrice: '1236' }
    },
    sources: []
  }

  it('should throw error if sellAmount AND buyAmount is provided', async () => {
    const input = { ...buildTradeInput, buyAmount: '1234.12', sellAmount: '1234.12' }

    await expect(zrxBuildTrade(deps, input)).rejects.toThrow(
      'ZrxSwapper:ZrxBuildTrade Exactly one of buyAmount or sellAmount is required'
    )
  })

  it('should throw error if sellAmount AND buyAmount are NOT provided', async () => {
    const input = { ...buildTradeInput, sellAmount: '', buyAmount: '' }

    await expect(zrxBuildTrade(deps, input)).rejects.toThrow(
      'ZrxSwapper:ZrxBuildTrade Exactly one of buyAmount or sellAmount is required'
    )
  })

  it('should throw error if sellAssetAccountId is NOT provided', async () => {
    const input = { ...buildTradeInput, sellAssetAccountId: '' }

    await expect(zrxBuildTrade(deps, input)).rejects.toThrow(
      'ZrxSwapper:ZrxBuildTrade Both sellAssetAccountId and buyAssetAccountId are required'
    )
  })

  it('should throw error if buyAssetAccountId is NOT provided', async () => {
    const input = { ...buildTradeInput, buyAssetAccountId: '' }

    await expect(zrxBuildTrade(deps, input)).rejects.toThrow(
      'ZrxSwapper:ZrxBuildTrade Both sellAssetAccountId and buyAssetAccountId are required'
    )
  })

  it('should throw error if slippage is higher than MAX_SLIPPAGE', async () => {
    const slippage = '31.0'
    const input = { ...buildTradeInput, slippage }

    await expect(zrxBuildTrade(deps, input)).rejects.toThrow(
      `ZrxSwapper:ZrxBuildTrade slippage value of ${slippage} is greater than max slippage value of ${MAX_SLIPPAGE}`
    )
  })

  it('should throw error if tokenId, symbol and network are not provided for buyAsset', async () => {
    const input = {
      ...buildTradeInput,
      buyAsset: {
        ...buyAsset,
        tokenId: '',
        symbol: '',
        network: ''
      },
      wallet
    } as unknown as BuildTradeInput

    await expect(zrxBuildTrade(deps, input)).rejects.toThrow(
      'ZrxSwapper:ZrxBuildTrade One of buyAssetContract or buyAssetSymbol or buyAssetNetwork are required'
    )
  })

  it('should throw error if tokenId, symbol and network are not provided for sellAsset', async () => {
    const input = {
      ...buildTradeInput,
      sellAsset: {
        ...sellAsset,
        tokenId: '',
        symbol: '',
        network: ''
      },
      wallet
    } as unknown as BuildTradeInput

    await expect(zrxBuildTrade(deps, input)).rejects.toThrow(
      'ZrxSwapper:ZrxBuildTrade One of sellAssetContract or sellAssetSymbol or sellAssetNetwork are required'
    )
  })

  it('should return a quote response', async () => {
    const allowanceOnChain = '1000'
    const data = {
      ...quoteResponse
    }
    ;(web3Instance.eth.Contract as jest.Mock<unknown>).mockImplementation(() => ({
      methods: {
        allowance: jest.fn(() => ({
          call: jest.fn(() => allowanceOnChain)
        }))
      }
    }))
    ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(Promise.resolve({ data }))

    expect(await zrxBuildTrade(deps, { ...buildTradeInput })).toEqual({
      ...buildTradeResponse,
      buyAsset
    })
  })

  it('should return a quote response with rate when price is given', async () => {
    const allowanceOnChain = '1000'
    const price = '1000'
    const data = {
      ...quoteResponse,
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

    expect(await zrxBuildTrade(deps, { ...buildTradeInput })).toEqual({
      ...buildTradeResponse,
      rate: price,
      buyAsset
    })
  })

  it('should return a quote response with gasPrice multiplied by estimatedGas', async () => {
    const gasPrice = '10000'
    const estimatedGas = '100'
    const data = {
      ...quoteResponse,
      allowanceTarget: 'allowanceTargetAddress',
      gas: estimatedGas,
      gasPrice
    }
    ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(Promise.resolve({ data }))

    expect(await zrxBuildTrade(deps, { ...buildTradeInput, wallet })).toEqual({
      ...buildTradeResponse,
      feeData: {
        chainSpecific: {
          approvalFee: bnOrZero(APPROVAL_GAS_LIMIT).multipliedBy(gasPrice).toString(),
          gasPrice,
          estimatedGas
        },
        fee: bnOrZero(gasPrice).multipliedBy(estimatedGas).toString()
      },
      buyAsset
    })
  })
})
