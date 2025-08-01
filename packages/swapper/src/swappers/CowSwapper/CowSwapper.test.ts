import { ethChainId } from '@shapeshiftoss/caip'
import type { OrderQuoteResponse } from '@shapeshiftoss/types'
import { Ok } from '@sniptt/monads'
import type { AxiosResponse } from 'axios'
import { describe, expect, it, vi } from 'vitest'

import type { GetUnsignedEvmMessageArgs, SwapperConfig, TradeQuote } from '../../types'
import { cowApi } from './endpoints'
import { cowService } from './utils/cowService'

const mockedCowService = vi.mocked(cowService)

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('./utils/cowService', () => {
  const mockAxios = {
    default: {
      create: vi.fn(() => ({
        get: mocks.get,
        post: mocks.post,
      })),
    },
  }

  return {
    cowService: mockAxios.default.create(),
  }
})

vi.mock('./getCowSwapTradeQuote/getCowSwapTradeQuote', () => ({
  getCowSwapTradeQuote: vi.fn(),
}))

vi.mock('@/state/slices/assetsSlice/selectors', async () => {
  const {
    BTC,
    ETH,
    FOX_GNOSIS,
    FOX_MAINNET,
    WBTC,
    WETH,
    XDAI,
    ETH_ARBITRUM,
    USDC_ARBITRUM,
  } = require('@/lib/swapper/swappers/utils/test-data/assets')

  const actual = await vi.importActual('@/state/slices/assetsSlice/selectors')
  return {
    ...actual,
    selectAssets: vi.fn(() => ({
      [BTC.assetId]: BTC,
      [ETH.assetId]: ETH,
      [FOX_GNOSIS.assetId]: FOX_GNOSIS,
      [FOX_MAINNET.assetId]: FOX_MAINNET,
      [WBTC.assetId]: WBTC,
      [WETH.assetId]: WETH,
      [XDAI.assetId]: XDAI,
      [ETH_ARBITRUM.assetId]: ETH_ARBITRUM,
      [USDC_ARBITRUM.assetId]: USDC_ARBITRUM,
    })),
  }
})

const MOCK_COWSWAP_CONFIG = {
  VITE_COWSWAP_BASE_URL: 'https://api.cow.fi',
} as SwapperConfig

describe('cowApi', () => {
  describe('getUnsignedEvmMessage', () => {
    it('should return the correct unsigned message', async () => {
      const from = '0x90a48d5cf7343b08da12e067680b4c6dbfe551be'
      const stepIndex = 0
      const chainId = ethChainId
      const slippageTolerancePercentageDecimal = '0.005' // 0.5%

      const cowswapQuoteResponse = {
        quote: {
          sellToken: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
          buyToken: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
          receiver: '0x90a48d5cf7343b08da12e067680b4c6dbfe551be',
          sellAmount: '9755648144619063874259',
          buyAmount: '289305614806369753',
          validTo: 1712259433,
          appData:
            '{"appCode":"shapeshift","metadata":{"orderClass":{"orderClass":"market"},"quote":{"slippageBips":50}},"version":"1.3.0"}',
          appDataHash: '0x41fffc0127f56060cc551652721d84c336f87649a20c51fcff5b8841dfeabe5b',
          feeAmount: '184116879335769833472',
          kind: 'sell',
          partiallyFillable: false,
          sellTokenBalance: 'erc20',
          buyTokenBalance: 'erc20',
          signingScheme: 'eip712',
        },
        from: '0x90a48d5cf7343b08da12e067680b4c6dbfe551be',
        expiration: '2024-04-04T19:09:12.792412370Z',
        id: 474006349,
        verified: false,
      }

      const tradeQuote: TradeQuote = {
        id: '474004127',
        quoteOrRate: 'quote',
        receiveAddress: '0x90a48d5cf7343b08da12e067680b4c6dbfe551be',
        affiliateBps: '0',
        rate: '0.00002965519158928897',
        slippageTolerancePercentageDecimal: '0.005',
        steps: [
          {
            allowanceContract: '0xc92e8bdf79f0507f65a392b0ab4667716bfe0110',
            rate: '0.00002965519158928897',
            feeData: {
              networkFeeCryptoBaseUnit: '0',
              protocolFees: {
                'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d': {
                  amountCryptoBaseUnit: '291070363839288541184',
                  requiresBalance: true,
                  asset: {
                    assetId: 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
                    chainId: 'eip155:1',
                    name: 'FOX on Ethereum',
                    precision: 18,
                    color: '#3761F9',
                    icon: '/fox-token-logo.png',
                    symbol: 'FOX',
                    explorer: 'https://etherscan.io',
                    explorerAddressLink: 'https://etherscan.io/address/',
                    explorerTxLink: 'https://etherscan.io/tx/',
                    relatedAssetKey: 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
                  },
                },
              },
            },
            sellAmountIncludingProtocolFeesCryptoBaseUnit: '9939765023954833707731',
            buyAmountBeforeFeesCryptoBaseUnit: '294765636137894062',
            buyAmountAfterFeesCryptoBaseUnit: '286133888732275878',
            source: 'CoW Swap',
            buyAsset: {
              assetId: 'eip155:1/slip44:60',
              chainId: 'eip155:1',
              symbol: 'ETH',
              name: 'Ethereum',
              networkName: 'Ethereum',
              precision: 18,
              color: '#5C6BC0',
              icon: 'https://rawcdn.githack.com/trustwallet/assets/32e51d582a890b3dd3135fe3ee7c20c2fd699a6d/blockchains/ethereum/info/logo.png',
              explorer: 'https://etherscan.io',
              explorerAddressLink: 'https://etherscan.io/address/',
              explorerTxLink: 'https://etherscan.io/tx/',
              relatedAssetKey: 'eip155:1/slip44:60',
            },
            sellAsset: {
              assetId: 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
              chainId: 'eip155:1',
              name: 'FOX on Ethereum',
              precision: 18,
              color: '#3761F9',
              icon: '/fox-token-logo.png',
              symbol: 'FOX',
              explorer: 'https://etherscan.io',
              explorerAddressLink: 'https://etherscan.io/address/',
              explorerTxLink: 'https://etherscan.io/tx/',
              relatedAssetKey: 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
            },
            accountNumber: 0,
            cowswapQuoteResponse,
          },
        ],
      } as unknown as TradeQuote

      mockedCowService.post.mockReturnValue(
        Promise.resolve(
          Ok({ data: cowswapQuoteResponse } as unknown as AxiosResponse<OrderQuoteResponse>),
        ),
      )
      const actual = await cowApi.getUnsignedEvmMessage?.({
        from,
        slippageTolerancePercentageDecimal,
        tradeQuote,
        stepIndex,
        chainId,
        config: MOCK_COWSWAP_CONFIG,
      } as unknown as GetUnsignedEvmMessageArgs)

      const expected = {
        chainId: 'eip155:1',
        orderToSign: {
          sellToken: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
          buyToken: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
          receiver: '0x90a48d5cf7343b08da12e067680b4c6dbfe551be',
          sellAmount: '9939765023954833707731',
          buyAmount: '287859086732337904',
          validTo: 1712259433,
          appData:
            '{"appCode":"shapeshift","metadata":{"orderClass":{"orderClass":"market"},"quote":{"slippageBips":50}},"version":"1.3.0"}',
          appDataHash: '0x41fffc0127f56060cc551652721d84c336f87649a20c51fcff5b8841dfeabe5b',
          feeAmount: '0',
          kind: 'sell',
          partiallyFillable: false,
          sellTokenBalance: 'erc20',
          buyTokenBalance: 'erc20',
          signingScheme: 'eip712',
          quoteId: 474006349,
        },
      }

      expect(actual).toEqual(expected)
    })
  })
})
