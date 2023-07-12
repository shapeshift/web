import type { ChainId } from '@shapeshiftoss/caip'
import { ETH, FOX } from 'test/constants'
import { TradeAmountInputField } from 'components/Trade/types'
import type { Swapper } from 'lib/swapper/api'
import { SwapperName } from 'lib/swapper/api'
import type { SwapperAction, SwapperState } from 'state/zustand/swapperStore/types'

const mockActions: SwapperAction = {
  clearAmounts(): void {},
  handleInputAmountChange(): void {},
  handleSwitchAssets(): void {},
  updateAction(): void {},
  updateAmount(): void {},
  updateAvailableSwappersWithMetadata(): void {},
  updateBuyAmountUserCurrency(): void {},
  updateBuyAssetAccountId(): void {},
  updateFees(): void {},
  updateReceiveAddress(): void {},
  updateSelectedBuyAssetAccountId(): void {},
  updateSelectedSellAssetAccountId(): void {},
  updateSellAmountUserCurrency(): void {},
  updateSellAssetAccountId(): void {},
  updateTrade(): void {},
  handleAssetSelection(): void {},
  updateTradeAmountsFromQuote(): void {},
  updateActiveAffiliateBps(): void {},
  updatePreferredSwapper(): void {},
}

export const baseSwapperState: SwapperState = {
  ...mockActions,
  trade: undefined,
  sellAmountUserCurrency: '33.00',
  buyAmountUserCurrency: '33.00',
  amount: '33',
  action: TradeAmountInputField.SELL_FIAT,
  buyAmountCryptoPrecision: '989.157064',
  sellAmountCryptoPrecision: '0.018665',
  sellAssetAccountId: 'eip155:1:0x32dbc9cf9e8fbcebe1e0a2ecf05ed86ca3096cb6',
  buyAssetAccountId: 'eip155:1:0x32dbc9cf9e8fbcebe1e0a2ecf05ed86ca3096cb6',
  activeAffiliateBps: '0',
  preferredSwapper: SwapperName.Thorchain,
  availableSwappersWithMetadata: [
    {
      swapper: {
        name: SwapperName.Zrx,
      } as Swapper<ChainId>,
      quote: {
        minimumCryptoHuman: '0.000565612596529604',
        steps: [
          {
            allowanceContract: '0x0000000000000000000000000000000000000000',
            rate: '52652.792329231222224912',
            feeData: {
              networkFeeCryptoBaseUnit: '2997000000000000',
              protocolFees: {},
            },
            sellAmountBeforeFeesCryptoBaseUnit: '18665000000000000',
            buyAmountBeforeFeesCryptoBaseUnit: '982764368825100762828',
            sources: [
              {
                name: 'Uniswap_V2',
                proportion: '1',
              },
            ],
            buyAsset: FOX,
            sellAsset: ETH,
            accountNumber: 0,
          },
        ],
      },
      inputOutputRatio: 0.8560784948911982,
    },
    {
      swapper: {
        name: SwapperName.Thorchain,
      } as Swapper<ChainId>,
      quote: {
        minimumCryptoHuman: '0.00576',
        recommendedSlippage: '0.00009729507077504896',
        steps: [
          {
            allowanceContract: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
            rate: '52867.94647736405036163943',
            sellAmountBeforeFeesCryptoBaseUnit: '18665000000000000',
            buyAmountBeforeFeesCryptoBaseUnit: '986780221000000000000',
            sources: [
              {
                name: 'THORChain',
                proportion: '1',
              },
            ],
            buyAsset: FOX,
            sellAsset: ETH,
            accountNumber: 0,
            feeData: {
              networkFeeCryptoBaseUnit: '1800000000000000',
              protocolFees: {
                [FOX.assetId]: {
                  amountCryptoBaseUnit: '258170392472859992504',
                  requiresBalance: false,
                  asset: FOX,
                },
              },
            },
          },
        ],
      },
      inputOutputRatio: 0.6773207214158627,
    },
  ],
  buyAsset: FOX,
  sellAsset: ETH,
  receiveAddress: '0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6',
  selectedSellAssetAccountId: 'eip155:1:0x32dbc9cf9e8fbcebe1e0a2ecf05ed86ca3096cb6',
  selectedBuyAssetAccountId: 'eip155:1:0x32dbc9cf9e8fbcebe1e0a2ecf05ed86ca3096cb6',
  fees: {
    chainSpecific: {
      estimatedGasCryptoBaseUnit: '1800000000000000',
    },
    tradeFeeSource: SwapperName.Thorchain,
    protocolFees: {
      [FOX.assetId]: {
        amountCryptoBaseUnit: '258170392472859992504',
        requiresBalance: false,
        asset: FOX,
      },
    },
    networkFeeCryptoHuman: '0.0018',
    networkFeeCryptoBaseUnit: '1800000000000000',
  },
}
