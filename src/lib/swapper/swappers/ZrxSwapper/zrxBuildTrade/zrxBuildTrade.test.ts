import type { ethereum } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'
import { Ok } from '@sniptt/monads'
import type { AxiosStatic } from 'axios'
import Web3 from 'web3'

import type { BuildTradeInput, QuoteFeeData } from '../../../api'
import type { ZrxTrade } from '../types'
import { setupZrxTradeQuoteResponse } from '../utils/test-data/setupZrxSwapQuote'
import { zrxServiceFactory } from '../utils/zrxService'
import type { ZrxSupportedChainId } from '../ZrxSwapper'
import { zrxBuildTrade } from './zrxBuildTrade'

jest.mock('web3')

jest.mock('lib/swapper/swappers/ZrxSwapper/utils/zrxService', () => {
  const axios: AxiosStatic = jest.createMockFromModule('axios')
  axios.create = jest.fn(() => axios)

  return {
    zrxServiceFactory: () => axios.create(),
  }
})
jest.mock('@shapeshiftoss/chain-adapters', () => {
  const { KnownChainIds } = require('@shapeshiftoss/types')
  return {
    isEvmChainId: jest.fn(() => true),
    evmChainIds: [KnownChainIds.EthereumMainnet],
    optimism: {
      isOptimismChainAdapter: jest.fn(() => false),
    },
  }
})
jest.mock('context/PluginProvider/chainAdapterSingleton', () => {
  const { KnownChainIds } = require('@shapeshiftoss/types')
  const { feeData } = require('../../utils/test-data/setupDeps')
  return {
    getChainAdapterManager: jest.fn(
      () =>
        new Map([
          [
            KnownChainIds.EthereumMainnet,
            {
              getChainId: () => KnownChainIds.EthereumMainnet,
              getFeeData: () => Promise.resolve(feeData),
            } as unknown as ethereum.ChainAdapter,
          ],
        ]),
    ),
  }
})

// @ts-ignore
Web3.mockImplementation(() => ({
  eth: {
    Contract: jest.fn(() => ({
      methods: {
        allowance: jest.fn(() => ({
          call: jest.fn(),
        })),
      },
    })),
  },
}))

const setup = () => {
  const ethNodeUrl = 'http://localhost:1000'
  const web3Provider = new Web3.providers.HttpProvider(ethNodeUrl)
  const web3Instance = new Web3(web3Provider)

  const zrxService = zrxServiceFactory({ baseUrl: 'https://api.0x.org/' })

  return { web3Instance, zrxService }
}

describe('zrxBuildTrade', () => {
  const { quoteResponse, sellAsset, buyAsset } = setupZrxTradeQuoteResponse()
  const { web3Instance, zrxService } = setup()
  const walletAddress = '0xc770eefad204b5180df6a14ee197d99d808ee52d'
  const wallet = {
    ethGetAddress: jest.fn(() => Promise.resolve(walletAddress)),
  } as unknown as HDWallet

  const buildTradeInput: BuildTradeInput = {
    chainId: KnownChainIds.EthereumMainnet,
    sendMax: false,
    sellAsset,
    buyAsset,
    sellAmountBeforeFeesCryptoBaseUnit: '1000000000000000000',
    accountNumber: 0,
    wallet,
    receiveAddress: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
    affiliateBps: '0',
    eip1559Support: false,
  }

  const buildTradeResponse: ZrxTrade = {
    sellAsset,
    buyAsset,
    sellAmountBeforeFeesCryptoBaseUnit: quoteResponse.sellAmount,
    buyAmountBeforeFeesCryptoBaseUnit: '',
    depositAddress: quoteResponse.to,
    receiveAddress: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
    accountNumber: 0,
    txData: quoteResponse.data,
    rate: quoteResponse.price,
    feeData: {
      networkFeeCryptoBaseUnit: '4080654495000000',
      protocolFees: {},
    },
    sources: [],
  }

  it('should return a quote response', async () => {
    const allowanceOnChain = '1000'
    const data = {
      ...quoteResponse,
    }
    ;(web3Instance.eth.Contract as jest.Mock<unknown>).mockImplementation(() => ({
      methods: {
        allowance: jest.fn(() => ({
          call: jest.fn(() => allowanceOnChain),
        })),
      },
    }))
    ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(Promise.resolve(Ok({ data })))

    const maybeBuiltTrade = await zrxBuildTrade({ ...buildTradeInput })
    expect(maybeBuiltTrade.isOk()).toBe(true)
    expect(maybeBuiltTrade.unwrap()).toEqual({
      ...buildTradeResponse,
      buyAsset,
    })
  })

  it('should return a quote response with rate when price is given', async () => {
    const allowanceOnChain = '1000'
    const price = '1000'
    const data = {
      ...quoteResponse,
      price,
    }
    ;(web3Instance.eth.Contract as jest.Mock<unknown>).mockImplementation(() => ({
      methods: {
        allowance: jest.fn(() => ({
          call: jest.fn(() => allowanceOnChain),
        })),
      },
    }))
    ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(Promise.resolve(Ok({ data })))

    const maybeBuiltTrade = await zrxBuildTrade({ ...buildTradeInput })
    expect(maybeBuiltTrade.isOk()).toBe(true)
    expect(maybeBuiltTrade.unwrap()).toEqual({
      ...buildTradeResponse,
      rate: price,
      buyAsset,
    })
  })

  it('should return a quote response with gasPrice multiplied by estimatedGas', async () => {
    const data = {
      ...quoteResponse,
      allowanceTarget: 'allowanceTargetAddress',
      gas: '100',
      gasPrice: '10000',
    }
    ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(Promise.resolve(Ok({ data })))

    const expectedFeeData: QuoteFeeData<ZrxSupportedChainId> = {
      protocolFees: {},
      networkFeeCryptoBaseUnit: '4080654495000000',
    }

    const maybeBuiltTrade = await zrxBuildTrade({ ...buildTradeInput, wallet })
    expect(maybeBuiltTrade.isOk()).toBe(true)
    expect(maybeBuiltTrade.unwrap()).toEqual({
      ...buildTradeResponse,
      feeData: expectedFeeData,
      buyAsset,
    })
  })
})
