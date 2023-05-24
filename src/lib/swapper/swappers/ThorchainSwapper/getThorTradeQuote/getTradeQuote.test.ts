import type { KnownChainIds } from '@shapeshiftoss/types'
import { Ok } from '@sniptt/monads'
import type { AxiosResponse, AxiosStatic } from 'axios'
import type Web3 from 'web3'
import * as selectors from 'state/zustand/swapperStore/amountSelectors'

import type { GetTradeQuoteInput, TradeQuote } from '../../../api'
import { SwapperName } from '../../../api'
import { ETH, FOX } from '../../utils/test-data/assets'
import { setupQuote } from '../../utils/test-data/setupSwapQuote'
import type { InboundAddressResponse, ThorchainSwapperDeps, ThornodePoolResponse } from '../types'
import { mockInboundAddresses, thornodePools } from '../utils/test-data/responses'
import { setupThorswapDeps } from '../utils/test-data/setupThorswapDeps'
import { thorService } from '../utils/thorService'
import { getThorTradeQuote } from './getTradeQuote'

jest.mock('../utils/thorService', () => {
  const axios: AxiosStatic = jest.createMockFromModule('axios')
  axios.create = jest.fn(() => axios)

  return {
    thorService: axios.create(),
  }
})
const selectBuyAssetUsdRateSpy = jest.spyOn(selectors, 'selectBuyAssetUsdRate')
const selectSellAssetUsdRateSpy = jest.spyOn(selectors, 'selectSellAssetUsdRate')

const expectedQuoteResponse: TradeQuote<KnownChainIds.EthereumMainnet> = {
  minimumCryptoHuman: '149.14668013703712946932',
  maximumCryptoHuman: '100000000000000000000000000',
  sellAmountBeforeFeesCryptoBaseUnit: '713014679420',
  allowanceContract: '0x3624525075b88B24ecc29CE226b0CEc1fFcB6976',
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
  sellAsset: FOX,
  accountNumber: 0,
  recommendedSlippage: '0.04357',
}

describe('getTradeQuote', () => {
  const { quoteInput } = setupQuote()
  const { adapterManager } = setupThorswapDeps()
  const deps: ThorchainSwapperDeps = {
    midgardUrl: '',
    daemonUrl: '',
    adapterManager,
    web3: {} as Web3,
  }

  it('should get a thorchain quote for a thorchain trade', async () => {
    ;(thorService.get as unknown as jest.Mock<unknown>).mockImplementation(url => {
      switch (url) {
        case '/lcd/thorchain/pools':
          return Promise.resolve(
            Ok({ data: thornodePools } as unknown as AxiosResponse<ThornodePoolResponse, any>),
          )
        case '/lcd/thorchain/inbound_addresses':
          return Promise.resolve(
            Ok({ data: mockInboundAddresses } as unknown as AxiosResponse<
              InboundAddressResponse[],
              any
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

    selectSellAssetUsdRateSpy.mockReturnValueOnce('0.15399605260336216')
    selectBuyAssetUsdRateSpy.mockReturnValueOnce('1595')

    const input: GetTradeQuoteInput = {
      ...quoteInput,
      sellAmountBeforeFeesCryptoBaseUnit: '713014679420',
      buyAsset: ETH,
      sellAsset: FOX,
    }

    const maybeTradeQuote = await getThorTradeQuote({ deps, input })
    expect(maybeTradeQuote.isOk()).toBe(true)
    expect(maybeTradeQuote.unwrap()).toEqual(expectedQuoteResponse)
  })
})
