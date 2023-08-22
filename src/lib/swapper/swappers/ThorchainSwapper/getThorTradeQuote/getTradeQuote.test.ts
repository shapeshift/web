import { Ok } from '@sniptt/monads'
import type { AxiosResponse, AxiosStatic } from 'axios'

import type { GetTradeQuoteInput } from '../../../api'
import { SwapperName } from '../../../api'
import { ETH, FOX_MAINNET } from '../../utils/test-data/assets'
import { setupQuote } from '../../utils/test-data/setupSwapQuote'
import { getThorTxInfo } from '../evm/utils/getThorTxData'
import type {
  InboundAddressResponse,
  ThornodePoolResponse,
  ThornodeQuoteResponseSuccess,
} from '../types'
import { mockInboundAddresses, thornodePools } from '../utils/test-data/responses'
import { mockChainAdapterManager } from '../utils/test-data/setupThorswapDeps'
import { thorService } from '../utils/thorService'
import type { ThorTradeQuote } from './getTradeQuote'
import { getThorTradeQuote } from './getTradeQuote'

jest.mock('../evm/utils/getThorTxData')
jest.mock('../utils/thorService', () => {
  const axios: AxiosStatic = jest.createMockFromModule('axios')
  axios.create = jest.fn(() => axios)

  return {
    thorService: axios.create(),
  }
})

jest.mock('context/PluginProvider/chainAdapterSingleton', () => {
  return {
    getChainAdapterManager: () => mockChainAdapterManager,
  }
})

jest.mock('config', () => {
  return {
    getConfig: () => ({
      REACT_APP_THORCHAIN_NODE_URL: '',
      REACT_APP_FEATURE_THOR_SWAP_STREAMING_SWAPS: true,
    }),
  }
})

const expectedQuoteResponse: ThorTradeQuote[] = [
  {
    isStreaming: false,
    rate: '144114.94366197183098591549',
    recommendedSlippage: '0.0435',
    data: '0x',
    router: '0x3624525075b88B24ecc29CE226b0CEc1fFcB6976',
    estimatedExecutionTimeMs: 600000,
    steps: [
      {
        allowanceContract: '0x3624525075b88B24ecc29CE226b0CEc1fFcB6976',
        sellAmountIncludingProtocolFeesCryptoBaseUnit: '713014679420',
        buyAmountBeforeFeesCryptoBaseUnit: '114321610000000000',
        feeData: {
          protocolFees: {
            [ETH.assetId]: {
              amountCryptoBaseUnit: '12000000000000000',
              requiresBalance: false,
              asset: ETH,
            },
          },
          networkFeeCryptoBaseUnit: '400000',
        },
        rate: '144114.94366197183098591549',
        source: SwapperName.Thorchain,
        buyAsset: ETH,
        sellAsset: FOX_MAINNET,
        accountNumber: 0,
      },
    ],
  },
  {
    isStreaming: true,
    rate: '158199.45070422535211267606',
    recommendedSlippage: '0.042',
    data: '0x',
    router: '0x3624525075b88B24ecc29CE226b0CEc1fFcB6976',
    estimatedExecutionTimeMs: 1600000,
    steps: [
      {
        allowanceContract: '0x3624525075b88B24ecc29CE226b0CEc1fFcB6976',
        sellAmountIncludingProtocolFeesCryptoBaseUnit: '713014679420',
        buyAmountBeforeFeesCryptoBaseUnit: '124321610000000000',
        feeData: {
          protocolFees: {
            [ETH.assetId]: {
              amountCryptoBaseUnit: '12000000000000000',
              requiresBalance: false,
              asset: ETH,
            },
          },
          networkFeeCryptoBaseUnit: '400000',
        },
        rate: '158199.45070422535211267606',
        source: `${SwapperName.Thorchain} • Streaming`,
        buyAsset: ETH,
        sellAsset: FOX_MAINNET,
        accountNumber: 0,
      },
    ],
  },
]

describe('getTradeQuote', () => {
  ;(getThorTxInfo as jest.Mock<unknown>).mockReturnValue(
    Promise.resolve({ data: '0x', router: '0x3624525075b88B24ecc29CE226b0CEc1fFcB6976' }),
  )

  const { quoteInput } = setupQuote()

  it('should get a thorchain quote for a thorchain trade', async () => {
    ;(thorService.get as unknown as jest.Mock<unknown>).mockImplementation(url => {
      switch (url) {
        case '/lcd/thorchain/pools':
          return Promise.resolve(
            Ok({ data: thornodePools } as unknown as AxiosResponse<ThornodePoolResponse>),
          )
        case '/lcd/thorchain/inbound_addresses':
          return Promise.resolve(
            Ok({ data: mockInboundAddresses } as unknown as AxiosResponse<
              InboundAddressResponse[]
            >),
          )
        default:
          // '/lcd/thorchain/quote/swap/<swapQueryParams>' fallthrough
          const mockThorQuote: { data: ThornodeQuoteResponseSuccess } = {
            data: {
              expected_amount_out: '10232161',
              expected_amount_out_streaming: '11232161',
              expiry: '1681132269',
              fees: {
                affiliate: '0',
                asset: 'ETH.ETH',
                outbound: '1200000',
              },
              inbound_address: 'bc1qucjrczghvwl5d66klz6npv7tshkpwpzlw0zzj8',
              notes:
                'First output should be to inbound_address, second output should be change back to self, third output should be OP_RETURN, limited to 80 bytes. Do not send below the dust threshold. Do not use exotic spend scripts, locks or address formats (P2WSH with Bech32 address format preferred).',
              outbound_delay_blocks: 575,
              outbound_delay_seconds: 6900,
              slippage_bps: 435,
              streaming_slippage_bps: 420,
              warning: 'Do not cache this response. Do not send funds after the expiry.',
              memo: '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6::ss:0',
              router: '0x3624525075b88B24ecc29CE226b0CEc1fFcB6976',
              streaming_swap_seconds: 400,
              total_swap_seconds: 1600,
              inbound_confirmation_seconds: 600,
            },
          }
          return Promise.resolve(Ok(mockThorQuote))
      }
    })

    const input: GetTradeQuoteInput = {
      ...quoteInput,
      sellAmountIncludingProtocolFeesCryptoBaseUnit: '713014679420',
      buyAsset: ETH,
      sellAsset: FOX_MAINNET,
      slippageTolerancePercentage: '0.04357',
    }

    const maybeTradeQuote = await getThorTradeQuote(input)
    expect(maybeTradeQuote.isOk()).toBe(true)
    expect(maybeTradeQuote.unwrap()).toEqual(expectedQuoteResponse)
  })
})
