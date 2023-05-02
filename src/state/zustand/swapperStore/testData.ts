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
  toggleIsExactAllowance(): void {},
  updateAction(): void {},
  updateActiveSwapperWithMetadata(): void {},
  updateAmount(): void {},
  updateAvailableSwappersWithMetadata(): void {},
  updateBuyAmountCryptoPrecision(): void {},
  updateBuyAmountFiat(): void {},
  updateBuyAssetAccountId(): void {},
  updateBuyAssetFiatRate(): void {},
  updateFeeAssetFiatRate(): void {},
  updateFees(): void {},
  updateIsExactAllowance(): void {},
  updateIsSendMax(): void {},
  updateReceiveAddress(): void {},
  updateSelectedBuyAssetAccountId(): void {},
  updateSelectedCurrencyToUsdRate(): void {},
  updateSelectedSellAssetAccountId(): void {},
  updateSellAmountCryptoPrecision(): void {},
  updateSellAmountFiat(): void {},
  updateSellAssetAccountId(): void {},
  updateSellAssetFiatRate(): void {},
  updateTrade(): void {},
  handleAssetSelection(): void {},
  updateTradeAmountsFromQuote(): void {},
  updateActiveAffiliateBps(): void {},
}

export const baseSwapperState: SwapperState = {
  ...mockActions,
  trade: undefined,
  sellAmountFiat: '33.00',
  buyAmountFiat: '33.00',
  amount: '33',
  isExactAllowance: false,
  action: TradeAmountInputField.SELL_FIAT,
  isSendMax: false,
  buyAmountCryptoPrecision: '989.157064',
  sellAmountCryptoPrecision: '0.018665',
  selectedCurrencyToUsdRate: '1',
  sellAssetAccountId: 'eip155:1:0x32dbc9cf9e8fbcebe1e0a2ecf05ed86ca3096cb6',
  buyAssetAccountId: 'eip155:1:0x32dbc9cf9e8fbcebe1e0a2ecf05ed86ca3096cb6',
  activeAffiliateBps: '0',
  availableSwappersWithMetadata: [
    {
      swapper: {
        name: SwapperName.Zrx,
      } as Swapper<ChainId>,
      quote: {
        rate: '52652.792329231222224912',
        minimumCryptoHuman: '0.000565612596529604',
        maximumCryptoHuman: '100000000000000000000000000',
        feeData: {
          networkFeeCryptoBaseUnit: '2997000000000000',
          buyAssetTradeFeeUsd: '0',
          sellAssetTradeFeeUsd: '0',
        },
        sellAmountBeforeFeesCryptoBaseUnit: '18665000000000000',
        buyAmountCryptoBaseUnit: '982764368825100762828',
        sources: [
          {
            name: 'Uniswap_V2',
            proportion: '1',
          },
        ],
        allowanceContract: '0x0000000000000000000000000000000000000000',
        buyAsset: FOX,
        sellAsset: ETH,
        accountNumber: 0,
      },
      inputOutputRatio: 0.8560784948911982,
    },
    {
      swapper: {
        name: SwapperName.Thorchain,
      } as Swapper<ChainId>,
      quote: {
        rate: '52867.94647736405036163943',
        maximumCryptoHuman: '100000000000000000000000000',
        sellAmountBeforeFeesCryptoBaseUnit: '18665000000000000',
        buyAmountCryptoBaseUnit: '986780221000000000000',
        sources: [
          {
            name: 'THORChain',
            proportion: '1',
          },
        ],
        buyAsset: FOX,
        sellAsset: ETH,
        accountNumber: 0,
        minimumCryptoHuman: '0.00576',
        recommendedSlippage: '0.00009729507077504896',
        allowanceContract: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
        feeData: {
          networkFeeCryptoBaseUnit: '1800000000000000',
          buyAssetTradeFeeUsd: '8.5196229516043797526224',
          sellAssetTradeFeeUsd: '0',
        },
      },
      inputOutputRatio: 0.6773207214158627,
    },
  ],
  activeSwapperWithMetadata: {
    swapper: {
      name: SwapperName.Thorchain,
    } as Swapper<ChainId>,
    quote: {
      rate: '52867.94647736405036163943',
      maximumCryptoHuman: '100000000000000000000000000',
      sellAmountBeforeFeesCryptoBaseUnit: '18665000000000000',
      buyAmountCryptoBaseUnit: '986780221000000000000',
      sources: [
        {
          name: 'THORChain',
          proportion: '1',
        },
      ],
      buyAsset: FOX,
      sellAsset: ETH,
      accountNumber: 0,
      minimumCryptoHuman: '0.00576',
      recommendedSlippage: '0.00009729507077504896',
      allowanceContract: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
      feeData: {
        networkFeeCryptoBaseUnit: '1800000000000000',
        buyAssetTradeFeeUsd: '8.5196229516043797526224',
        sellAssetTradeFeeUsd: '0',
      },
    },
    inputOutputRatio: 0.6773207214158627,
  },
  buyAsset: FOX,
  sellAsset: ETH,
  sellAssetFiatRate: '1767',
  buyAssetFiatRate: '0.033',
  feeAssetFiatRate: '1768',
  receiveAddress: '0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6',
  selectedSellAssetAccountId: 'eip155:1:0x32dbc9cf9e8fbcebe1e0a2ecf05ed86ca3096cb6',
  selectedBuyAssetAccountId: 'eip155:1:0x32dbc9cf9e8fbcebe1e0a2ecf05ed86ca3096cb6',
  fees: {
    chainSpecific: {
      approvalFeeCryptoBaseUnit: '1800000000000000',
      gasPriceCryptoBaseUnit: '18000000000',
      estimatedGasCryptoBaseUnit: '100000',
    },
    tradeFeeSource: SwapperName.Thorchain,
    buyAssetTradeFeeUsd: '8.5196229516043797526224',
    sellAssetTradeFeeUsd: '0',
    networkFeeCryptoHuman: '0.0018',
    networkFeeCryptoBaseUnit: '1800000000000000',
  },
}
