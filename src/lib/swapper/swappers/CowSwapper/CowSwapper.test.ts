import { ethChainId } from '@shapeshiftoss/caip'
import type { TradeQuote } from '@shapeshiftoss/swapper'
import { Ok } from '@sniptt/monads'
import type { AxiosResponse } from 'axios'
import { describe, expect, it, vi } from 'vitest'
import {
  BTC,
  ETH,
  FOX_GNOSIS,
  FOX_MAINNET,
  WBTC,
  WETH,
  XDAI,
} from 'lib/swapper/swappers/utils/test-data/assets'

import { cowSwapper } from './CowSwapper'
import { cowApi } from './endpoints'
import type { CowSwapQuoteResponse } from './types'
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

vi.mock('state/slices/assetsSlice/selectors', async () => {
  const {
    BTC,
    ETH,
    FOX_GNOSIS,
    FOX_MAINNET,
    WBTC,
    WETH,
    XDAI,
  } = require('lib/swapper/swappers/utils/test-data/assets')

  const actual = await vi.importActual('state/slices/assetsSlice/selectors')
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
    })),
  }
})

const ASSETS = [ETH, WBTC, WETH, BTC, FOX_MAINNET, XDAI]

describe('CowSwapper', () => {
  describe('filterAssetIdsBySellable', () => {
    it('returns empty array when called with an empty array', async () => {
      expect(await cowSwapper.filterAssetIdsBySellable([])).toEqual([])
    })

    it('returns array filtered out of non erc20 tokens', async () => {
      expect(await cowSwapper.filterAssetIdsBySellable(ASSETS)).toEqual([
        WBTC.assetId,
        WETH.assetId,
        FOX_MAINNET.assetId,
      ])
    })

    it('returns array filtered out of unsupported tokens', async () => {
      const assetIds = [FOX_MAINNET, FOX_GNOSIS, BTC]

      expect(await cowSwapper.filterAssetIdsBySellable(assetIds)).toEqual([
        FOX_MAINNET.assetId,
        FOX_GNOSIS.assetId,
      ])
    })
  })

  describe('filterBuyAssetsBySellAssetId', () => {
    it('returns empty array when called with an empty assetIds array', async () => {
      expect(
        await cowSwapper.filterBuyAssetsBySellAssetId({
          assets: [],
          sellAsset: WETH,
        }),
      ).toEqual([])
    })

    it('returns empty array when called with sellAssetId that is not sellable', async () => {
      expect(
        await cowSwapper.filterBuyAssetsBySellAssetId({
          assets: ASSETS,
          sellAsset: ETH,
        }),
      ).toEqual([])
      expect(
        await cowSwapper.filterBuyAssetsBySellAssetId({
          assets: ASSETS,
          sellAsset: BTC,
        }),
      ).toEqual([])
    })

    it('returns array filtered out of non erc20 tokens when called with a sellable sellAssetId', async () => {
      expect(
        await cowSwapper.filterBuyAssetsBySellAssetId({
          assets: ASSETS,
          sellAsset: WETH,
        }),
      ).toEqual([ETH.assetId, WBTC.assetId, FOX_MAINNET.assetId])
      expect(
        await cowSwapper.filterBuyAssetsBySellAssetId({
          assets: ASSETS,
          sellAsset: WBTC,
        }),
      ).toEqual([ETH.assetId, WETH.assetId, FOX_MAINNET.assetId])
      expect(
        await cowSwapper.filterBuyAssetsBySellAssetId({
          assets: ASSETS,
          sellAsset: FOX_MAINNET,
        }),
      ).toEqual([ETH.assetId, WBTC.assetId, WETH.assetId])
    })

    it('returns array filtered out of unsupported tokens when called with a sellable sellAssetId', async () => {
      const assets = [FOX_MAINNET, BTC]
      expect(
        await cowSwapper.filterBuyAssetsBySellAssetId({
          assets,
          sellAsset: WETH,
        }),
      ).toEqual([FOX_MAINNET.assetId])
      expect(
        await cowSwapper.filterBuyAssetsBySellAssetId({
          assets,
          sellAsset: FOX_MAINNET,
        }),
      ).toEqual([])
    })
  })
})

describe('cowApi', () => {
  describe('getUnsignedEvmMessage', () => {
    it('should return the correct unsigned message', async () => {
      const from = '0x90a48d5cf7343b08da12e067680b4c6dbfe551be'
      const stepIndex = 0
      const chainId = ethChainId
      const slippageTolerancePercentageDecimal = '0.005' // 0.5%
      const tradeQuote = {
        id: '474004127',
        receiveAddress: '0x90a48d5cf7343b08da12e067680b4c6dbfe551be',
        affiliateBps: '0',
        potentialAffiliateBps: '48',
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
                    icon: 'https://assets.coincap.io/assets/icons/256/fox.png',
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
              icon: 'https://assets.coincap.io/assets/icons/256/eth.png',
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
              icon: 'https://assets.coincap.io/assets/icons/256/fox.png',
              symbol: 'FOX',
              explorer: 'https://etherscan.io',
              explorerAddressLink: 'https://etherscan.io/address/',
              explorerTxLink: 'https://etherscan.io/tx/',
              relatedAssetKey: 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
            },
            accountNumber: 0,
          },
        ],
      } as unknown as TradeQuote

      const cowSwapQuoteResponse = {
        quote: {
          sellToken: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
          buyToken: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
          receiver: '0x90a48d5cf7343b08da12e067680b4c6dbfe551be',
          sellAmount: '9755648144619063874259',
          buyAmount: '289305614806369753',
          validTo: 1712259433,
          appData:
            '{"appCode":"shapeshift","metadata":{"orderClass":{"orderClass":"market"},"quote":{"slippageBips":"50"}},"version":"0.9.0"}',
          appDataHash: '0x9b3c15b566e3b432f1ba3533bb0b071553fd03cec359caf3e6559b29fec1e62e',
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
      mockedCowService.post.mockReturnValue(
        Promise.resolve(
          Ok({ data: cowSwapQuoteResponse } as unknown as AxiosResponse<CowSwapQuoteResponse>),
        ),
      )
      const actual = await cowApi.getUnsignedEvmMessage!({
        from,
        slippageTolerancePercentageDecimal,
        tradeQuote,
        stepIndex,
        chainId,
      })

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
            '{"appCode":"shapeshift","metadata":{"orderClass":{"orderClass":"market"},"quote":{"slippageBips":"50"}},"version":"0.9.0"}',
          appDataHash: '0x9b3c15b566e3b432f1ba3533bb0b071553fd03cec359caf3e6559b29fec1e62e',
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
