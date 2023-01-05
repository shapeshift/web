import { KnownChainIds } from '@shapeshiftoss/types'
import Web3 from 'web3'

import type { GetTradeQuoteInput, TradeQuote } from '../../../api'
import { SwapperName } from '../../../api'
import { ETH, FOX } from '../../utils/test-data/assets'
import { setupQuote } from '../../utils/test-data/setupSwapQuote'
import type { ThorchainSwapperDeps } from '../types'
import { getUsdRate } from '../utils/getUsdRate/getUsdRate'
import { mockInboundAddresses, thornodePools } from '../utils/test-data/responses'
import { setupThorswapDeps } from '../utils/test-data/setupThorswapDeps'
import { thorService } from '../utils/thorService'
import { getThorTradeQuote } from './getTradeQuote'

jest.mock('../utils/thorService')
jest.mock('../utils/getUsdRate/getUsdRate')

const mockedAxios = jest.mocked(thorService, true)

const expectedQuoteResponse: TradeQuote<KnownChainIds.EthereumMainnet> = {
  minimumCryptoHuman: '59.658672054814851787728',
  maximum: '100000000000000000000000000',
  sellAmountBeforeFeesCryptoBaseUnit: '10000000000000000000', // 1000 FOX
  allowanceContract: '0x3624525075b88B24ecc29CE226b0CEc1fFcB6976',
  buyAmountCryptoBaseUnit: '784000000000000',
  feeData: {
    chainSpecific: {
      estimatedGas: '100000',
      approvalFeeCryptoBaseUnit: '700000',
      gasPriceCryptoBaseUnit: '7',
    },
    buyAssetTradeFeeUsd: '7.656',
    sellAssetTradeFeeUsd: '0',
    networkFeeCryptoBaseUnit: '700000',
  },
  rate: '0.0000784',
  sources: [{ name: SwapperName.Thorchain, proportion: '1' }],
  buyAsset: ETH,
  sellAsset: FOX,
  accountNumber: 0,
  recommendedSlippage: '0.00000608624714961082',
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

  it('should get a thorchain quote for a thorchain trade', async () => {
    mockedAxios.get.mockImplementation((url) => {
      switch (url) {
        case '/lcd/thorchain/pools':
          return Promise.resolve({ data: thornodePools })
        case '/lcd/thorchain/inbound_addresses':
          return Promise.resolve({ data: mockInboundAddresses })
        default:
          return Promise.resolve({ data: undefined })
      }
    })
    ;(getUsdRate as jest.Mock<unknown>)
      .mockReturnValueOnce(Promise.resolve('0.15399605260336216')) // sellAsset
      .mockReturnValueOnce(Promise.resolve('1595')) // buyAsset

    const input: GetTradeQuoteInput = {
      ...quoteInput,
      sellAmountBeforeFeesCryptoBaseUnit: '10000000000000000000', // 10 FOX
      buyAsset: ETH,
      sellAsset: FOX,
    }

    const tradeQuote = await getThorTradeQuote({ deps, input })
    expect(tradeQuote).toEqual(expectedQuoteResponse)
  })
})
