import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'
import Web3 from 'web3'

import { TradeQuote } from '../../../api'
import { ETH, FOX } from '../../utils/test-data/assets'
import { setupQuote } from '../../utils/test-data/setupSwapQuote'
import { ThorchainSwapperDeps } from '../types'
import { ethMidgardPool, ethThornodePool, foxThornodePool } from '../utils/test-data/responses'
import { setupThorswapDeps } from '../utils/test-data/setupThorswapDeps'
import { thorService } from '../utils/thorService'
import { getThorTradeQuote } from './getTradeQuote'

jest.mock('../utils/thorService')
jest.mock('web3')

// @ts-ignore
Web3.mockImplementation(() => ({
  eth: {
    Contract: jest.fn(() => ({
      methods: {
        deposit: jest.fn(() => ({
          encodeABI: jest.fn(() => '0x1234'),
        })),
      },
    })),
  },
}))

const mockedAxios = jest.mocked(thorService, true)

const quoteResponse: TradeQuote<KnownChainIds.EthereumMainnet> = {
  minimum: '7.795654563912575051016',
  maximum: '100000000000000000000000000',
  sellAmount: '10000000000000000000', // 1000 FOX
  allowanceContract: '0x3624525075b88B24ecc29CE226b0CEc1fFcB6976',
  buyAmount: '784000000000000',
  feeData: {
    fee: '700000',
    chainSpecific: { estimatedGas: '100000', approvalFee: '700000', gasPrice: '7' },
    tradeFee: '0.00050931609817562157',
  },
  rate: '0.0000784',
  sources: [{ name: 'thorchain', proportion: '1' }],
  buyAsset: ETH,
  sellAsset: FOX,
  bip44Params: { purpose: 44, coinType: 60, accountNumber: 0 },
}

describe('getTradeQuote', () => {
  const { quoteInput } = setupQuote()
  const { adapterManager } = setupThorswapDeps()
  const deps = {
    midgardUrl: '',
    daemonUrl: '',
    adapterManager,
  } as unknown as ThorchainSwapperDeps

  const wallet = {
    supportsOfflineSigning: jest.fn(() => true),
  } as unknown as HDWallet

  it('should get a thorchain quote for a thorchain trade', async () => {
    const addressData = [
      {
        router: '0x3624525075b88B24ecc29CE226b0CEc1fFcB6976',
        address: '0x084b1c3C81545d370f3634392De611CaaBFf8148',
        chain: 'ETH',
        gas_rate: '1',
      },
    ]
    const input = {
      ...quoteInput,
      sellAmount: '10000000000000000000', // 100 FOX
      buyAsset: ETH,
      sellAsset: FOX,
      wallet,
    }

    mockedAxios.get.mockImplementation((url) => {
      const isMidgardPoolResponse = url.includes('/pool/')
      const isThornodePoolsResponse = url.includes('lcd/thorchain/pools')

      const data = (() => {
        switch (true) {
          case isMidgardPoolResponse:
            return ethMidgardPool
          case isThornodePoolsResponse:
            return [ethThornodePool, foxThornodePool]
          default:
            return addressData
        }
      })()
      return Promise.resolve({ data })
    })

    const tradeQuote = await getThorTradeQuote({ deps, input })
    expect(tradeQuote).toEqual(quoteResponse)
  })
})
