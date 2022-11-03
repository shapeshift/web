import { KnownChainIds } from '@shapeshiftoss/types'
import Web3 from 'web3'

import type { GetTradeQuoteInput, TradeQuote } from '../../../api'
import { ETH, FOX } from '../../utils/test-data/assets'
import { setupQuote } from '../../utils/test-data/setupSwapQuote'
import type { ThorchainSwapperDeps } from '../types'
import {
  ethMidgardPool,
  ethThornodePool,
  foxThornodePool,
  mockInboundAddresses,
} from '../utils/test-data/responses'
import { setupThorswapDeps } from '../utils/test-data/setupThorswapDeps'
import { thorService } from '../utils/thorService'
import { getThorTradeQuote } from './getTradeQuote'

jest.mock('../utils/thorService')

const mockedAxios = jest.mocked(thorService, true)

const quoteResponse: TradeQuote<KnownChainIds.EthereumMainnet> = {
  minimumCryptoHuman: '0.00576',
  maximum: '100000000000000000000000000',
  sellAmountCryptoPrecision: '10000000000000000000', // 1000 FOX
  allowanceContract: '0x3624525075b88B24ecc29CE226b0CEc1fFcB6976',
  buyAmountCryptoPrecision: '784000000000000',
  feeData: {
    chainSpecific: { estimatedGas: '100000', approvalFee: '700000', gasPrice: '7' },
    buyAssetTradeFeeUsd: '7.656',
    sellAssetTradeFeeUsd: '0',
    networkFee: '700000',
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
  const deps: ThorchainSwapperDeps = {
    midgardUrl: '',
    daemonUrl: '',
    adapterManager,
    web3: <Web3>{},
  }

  beforeEach(() => {
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
            return mockInboundAddresses
        }
      })()
      return Promise.resolve({ data })
    })
  })

  it('should get a thorchain quote for a thorchain trade', async () => {
    const input: GetTradeQuoteInput = {
      ...quoteInput,
      sellAmountCryptoPrecision: '10000000000000000000', // 100 FOX
      buyAsset: ETH,
      sellAsset: FOX,
    }

    const tradeQuote = await getThorTradeQuote({ deps, input })
    expect(tradeQuote).toEqual(quoteResponse)
  })
})
