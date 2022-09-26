import { ethereum } from '@shapeshiftoss/chain-adapters'
import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import { AxiosStatic } from 'axios'
import Web3 from 'web3'

import { BuildTradeInput } from '../../../api'
import { bnOrZero } from '../../utils/bignumber'
import { APPROVAL_GAS_LIMIT } from '../../utils/constants'
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
    sellAmount: '1000000000000000000',
    bip44Params: { purpose: 44, coinType: 60, accountNumber: 0 },
    wallet,
    receiveAddress: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
  }

  const buildTradeResponse = {
    sellAsset,
    sellAmount: quoteResponse.sellAmount,
    buyAmount: '',
    depositAddress: quoteResponse.to,
    receiveAddress: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
    bip44Params: { purpose: 44, coinType: 60, accountNumber: 0 },
    txData: quoteResponse.data,
    rate: quoteResponse.price,
    feeData: {
      fee: (Number(quoteResponse.gas) * Number(quoteResponse.gasPrice)).toString(),
      chainSpecific: { approvalFee: '123600000', estimatedGas: '1235', gasPrice: '1236' },
      tradeFee: '0',
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
    const gasPrice = '10000'
    const estimatedGas = '100'
    const data = {
      ...quoteResponse,
      allowanceTarget: 'allowanceTargetAddress',
      gas: estimatedGas,
      gasPrice,
    }
    ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(Promise.resolve({ data }))

    expect(await zrxBuildTrade(deps, { ...buildTradeInput, wallet })).toEqual({
      ...buildTradeResponse,
      feeData: {
        chainSpecific: {
          approvalFee: bnOrZero(APPROVAL_GAS_LIMIT).multipliedBy(gasPrice).toString(),
          gasPrice,
          estimatedGas,
        },
        fee: bnOrZero(gasPrice).multipliedBy(estimatedGas).toString(),
        tradeFee: '0',
      },
      buyAsset,
    })
  })
})
