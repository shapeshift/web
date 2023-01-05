import { ethereum } from '@shapeshiftoss/chain-adapters'
import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import { AxiosStatic } from 'axios'
import Web3 from 'web3'

import { BuildTradeInput, EvmSupportedChainIds, QuoteFeeData } from '../../../api'
import { bnOrZero } from '../../utils/bignumber'
import { APPROVAL_GAS_LIMIT } from '../../utils/constants'
import { ZrxTrade } from '../types'
import { setupZrxTradeQuoteResponse } from '../utils/test-data/setupZrxSwapQuote'
import { zrxServiceFactory } from '../utils/zrxService'
import { zrxBuildTrade } from './zrxBuildTrade'

jest.mock('web3')

const axios: AxiosStatic = jest.createMockFromModule('axios')
axios.create = jest.fn(() => axios)

jest.mock('../utils/zrxService', () => ({
  zrxServiceFactory: () => axios.create(),
}))

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
  const adapter = new ethereum.ChainAdapter({
    providers: {
      ws: new unchained.ws.Client<unchained.ethereum.Tx>('ws://localhost:31300'),
      http: new unchained.ethereum.V1Api(
        new unchained.ethereum.Configuration({
          basePath: 'http://localhost:31300',
        }),
      ),
    },
    rpcUrl: ethNodeUrl,
  })
  const zrxService = zrxServiceFactory('https://api.0x.org/')

  return { web3Instance, adapter, zrxService }
}

describe('zrxBuildTrade', () => {
  const { quoteResponse, sellAsset, buyAsset } = setupZrxTradeQuoteResponse()
  const { web3Instance, adapter, zrxService } = setup()
  const walletAddress = '0xc770eefad204b5180df6a14ee197d99d808ee52d'
  const wallet = {
    ethGetAddress: jest.fn(() => Promise.resolve(walletAddress)),
  } as unknown as HDWallet
  const deps = {
    adapter,
    web3: web3Instance,
  }

  const buildTradeInput: BuildTradeInput = {
    chainId: KnownChainIds.EthereumMainnet,
    sendMax: false,
    sellAsset,
    buyAsset,
    sellAmountBeforeFeesCryptoBaseUnit: '1000000000000000000',
    accountNumber: 0,
    wallet,
    receiveAddress: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
  }

  const buildTradeResponse: ZrxTrade<EvmSupportedChainIds> = {
    sellAsset,
    buyAsset,
    sellAmountBeforeFeesCryptoBaseUnit: quoteResponse.sellAmount,
    buyAmountCryptoBaseUnit: '',
    depositAddress: quoteResponse.to,
    receiveAddress: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
    accountNumber: 0,
    txData: quoteResponse.data,
    rate: quoteResponse.price,
    feeData: {
      chainSpecific: {
        approvalFeeCryptoBaseUnit: '123600000',
        estimatedGas: '1235',
        gasPriceCryptoBaseUnit: '1236',
      },
      networkFeeCryptoBaseUnit: (
        Number(quoteResponse.gas) * Number(quoteResponse.gasPrice)
      ).toString(),
      sellAssetTradeFeeUsd: '0',
      buyAssetTradeFeeUsd: '0',
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
    ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(Promise.resolve({ data }))

    expect(await zrxBuildTrade(deps, { ...buildTradeInput })).toEqual({
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
    ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(Promise.resolve({ data }))

    expect(await zrxBuildTrade(deps, { ...buildTradeInput })).toEqual({
      ...buildTradeResponse,
      rate: price,
      buyAsset,
    })
  })

  it('should return a quote response with gasPrice multiplied by estimatedGas', async () => {
    const gasPriceCryptoBaseUnit = '10000'
    const estimatedGas = '100'
    const data = {
      ...quoteResponse,
      allowanceTarget: 'allowanceTargetAddress',
      gas: estimatedGas,
      gasPrice: gasPriceCryptoBaseUnit,
    }
    ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(Promise.resolve({ data }))

    const expectedFeeData: QuoteFeeData<EvmSupportedChainIds> = {
      chainSpecific: {
        approvalFeeCryptoBaseUnit: bnOrZero(APPROVAL_GAS_LIMIT)
          .multipliedBy(gasPriceCryptoBaseUnit)
          .toString(),
        gasPriceCryptoBaseUnit,
        estimatedGas,
      },
      buyAssetTradeFeeUsd: '0',
      sellAssetTradeFeeUsd: '0',
      networkFeeCryptoBaseUnit: bnOrZero(gasPriceCryptoBaseUnit)
        .multipliedBy(estimatedGas)
        .toString(),
    }

    expect(await zrxBuildTrade(deps, { ...buildTradeInput, wallet })).toEqual({
      ...buildTradeResponse,
      feeData: expectedFeeData,
      buyAsset,
    })
  })
})
