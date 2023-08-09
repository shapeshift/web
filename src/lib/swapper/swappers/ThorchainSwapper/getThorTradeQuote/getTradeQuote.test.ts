import { Ok } from '@sniptt/monads'
import type { AxiosResponse, AxiosStatic } from 'axios'

import type { GetTradeQuoteInput } from '../../../api'
import { SwapperName } from '../../../api'
import { ETH, FOX_MAINNET } from '../../utils/test-data/assets'
import { setupQuote } from '../../utils/test-data/setupSwapQuote'
import { getThorTxInfo } from '../evm/utils/getThorTxData'
import type { InboundAddressResponse, ThornodePoolResponse } from '../types'
import { mockInboundAddresses, thornodePools } from '../utils/test-data/responses'
import { mockChainAdapterManager } from '../utils/test-data/setupThorswapDeps'
import { thorService } from '../utils/thorService'
import type { ThorEvmTradeQuote } from './getTradeQuote'
import { getThorTradeQuote } from './getTradeQuote'

jest.mock('../evm/utils/getThorTxData')
jest.mock('../utils/thorService', () => {
  const axios: AxiosStatic = jest.createMockFromModule('axios')
  axios.create = jest.fn(() => axios)

  return {
    thorService: axios.create(),
  }
})

const mockOk = Ok as jest.MockedFunction<typeof Ok>

jest.mock('context/PluginProvider/chainAdapterSingleton', () => {
  return {
    getChainAdapterManager: () => mockChainAdapterManager,
  }
})

jest.mock('config', () => {
  return {
    getConfig: () => ({
      REACT_APP_THORCHAIN_NODE_URL: '',
    }),
  }
})

const expectedQuoteResponse: ThorEvmTradeQuote = {
  minimumCryptoHuman: '149.14668013703712946932',
  recommendedSlippage: '0.04357',
  data: '0x',
  router: '0x3624525075b88B24ecc29CE226b0CEc1fFcB6976',
  steps: [
    {
      allowanceContract: '0x3624525075b88B24ecc29CE226b0CEc1fFcB6976',
      sellAmountBeforeFeesCryptoBaseUnit: '713014679420',
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
      sources: [{ name: SwapperName.Thorchain, proportion: '1' }],
      buyAsset: ETH,
      sellAsset: FOX_MAINNET,
      accountNumber: 0,
    },
  ],
}

describe('getTradeQuote', () => {
  ;(getThorTxInfo as jest.Mock<unknown>).mockReturnValue(
    Promise.resolve(mockOk({ data: '0x', router: '0x3624525075b88B24ecc29CE226b0CEc1fFcB6976' })),
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
          return Promise.resolve(
            Ok({
              data: {
                dust_threshold: '10000',
                expected_amount_out: '10232161',
                expiry: 1681132269,
                fees: {
                  affiliate: '0',
                  asset: 'ETH.ETH',
                  outbound: '1200000',
                },
                inbound_address: 'bc1qucjrczghvwl5d66klz6npv7tshkpwpzlw0zzj8',
                inbound_confirmation_blocks: 2,
                inbound_confirmation_seconds: 1200,
                notes:
                  'First output should be to inbound_address, second output should be change back to self, third output should be OP_RETURN, limited to 80 bytes. Do not send below the dust threshold. Do not use exotic spend scripts, locks or address formats (P2WSH with Bech32 address format preferred).',
                outbound_delay_blocks: 575,
                outbound_delay_seconds: 6900,
                slippage_bps: 4357,
                warning: 'Do not cache this response. Do not send funds after the expiry.',
                memo: '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6::ss:0',
              },
            }),
          )
      }
    })

    const input: GetTradeQuoteInput = {
      ...quoteInput,
      sellAmountBeforeFeesCryptoBaseUnit: '713014679420',
      buyAsset: ETH,
      sellAsset: FOX_MAINNET,
    }

    const maybeTradeQuote = await getThorTradeQuote(input, {
      sellAssetUsdRate: '0.15399605260336216',
      buyAssetUsdRate: '1595',
      feeAssetUsdRate: '1595',
      runeAssetUsdRate: '0.30',
    })
    expect(maybeTradeQuote.isOk()).toBe(true)
    expect(maybeTradeQuote.unwrap()).toEqual(expectedQuoteResponse)
  })
})
