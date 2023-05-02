import type { Asset } from '@shapeshiftoss/asset-service'
import type { AccountId } from '@shapeshiftoss/caip'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { AssetClickAction } from 'components/Trade/hooks/useTradeRoutes/types'
import type { DisplayFeeData, TradeAmountInputField } from 'components/Trade/types'
import type { SwapperWithQuoteMetadata, Trade } from 'lib/swapper/api'
import type { CowTrade } from 'lib/swapper/swappers/CowSwapper/types'

export type SwapperStore<C extends KnownChainIds = KnownChainIds> = {
  selectedSellAssetAccountId?: AccountId
  selectedBuyAssetAccountId?: AccountId
  sellAssetAccountId?: AccountId
  buyAssetAccountId?: AccountId
  buyAmountCryptoPrecision: string
  sellAmountCryptoPrecision: string
  sellAsset: Asset
  buyAsset: Asset
  sellAmountFiat: string
  buyAmountFiat: string
  sellAssetFiatRate?: string
  buyAssetFiatRate?: string
  feeAssetFiatRate?: string
  action: TradeAmountInputField
  isExactAllowance: boolean
  isSendMax: boolean
  amount: string
  receiveAddress?: string
  fees?: DisplayFeeData<C>
  trade?: Trade<C> | CowTrade<C>
  activeSwapperWithMetadata?: SwapperWithQuoteMetadata
  availableSwappersWithMetadata?: SwapperWithQuoteMetadata[]
  selectedCurrencyToUsdRate?: string
  activeAffiliateBps: string
}

type HandleAssetSelectionInput = { asset: Asset; action: AssetClickAction }

export type SwapperAction = {
  updateSelectedSellAssetAccountId: (accountId: SwapperStore['selectedSellAssetAccountId']) => void
  updateSelectedBuyAssetAccountId: (accountId: SwapperStore['selectedBuyAssetAccountId']) => void
  updateSellAssetAccountId: (accountId: SwapperStore['sellAssetAccountId']) => void
  updateBuyAssetAccountId: (accountId: SwapperStore['buyAssetAccountId']) => void
  updateSellAmountFiat: (sellAmountFiat: SwapperStore['sellAmountFiat']) => void
  updateBuyAmountFiat: (buyAmountFiat: SwapperStore['buyAmountFiat']) => void
  updateSellAssetFiatRate: (sellAssetFiatRate: SwapperStore['sellAssetFiatRate']) => void
  updateBuyAssetFiatRate: (buyAssetFiatRate: SwapperStore['buyAssetFiatRate']) => void
  updateFeeAssetFiatRate: (feeAssetFiatRate: SwapperStore['feeAssetFiatRate']) => void
  clearAmounts: () => void
  updateAction: (action: SwapperStore['action']) => void
  updateIsExactAllowance: (isExactAllowance: SwapperStore['isExactAllowance']) => void
  updateIsSendMax: (isSendMax: SwapperStore['isSendMax']) => void
  updateAmount: (amount: SwapperStore['amount']) => void
  updateReceiveAddress: (receiveAddress: SwapperStore['receiveAddress']) => void
  toggleIsExactAllowance: () => void
  updateTrade: (trade: SwapperStore['trade']) => void
  updateActiveSwapperWithMetadata: (
    activeSwapperWithMetadata: SwapperStore['activeSwapperWithMetadata'],
  ) => void
  updateAvailableSwappersWithMetadata: (
    availableSwappersWithMetadata: SwapperStore['availableSwappersWithMetadata'],
  ) => void
  updateBuyAmountCryptoPrecision: (buyAmountCryptoPrecision: string) => void
  updateSellAmountCryptoPrecision: (sellAmountCryptoPrecision: string) => void
  handleSwitchAssets: () => void
  updateSelectedCurrencyToUsdRate: (selectedCurrencyToUsdRate: string) => void
  handleInputAmountChange: () => void
  handleAssetSelection: (handleAssetSelectionInput: HandleAssetSelectionInput) => void
  updateFees: (sellFeeAsset: Asset) => void
  updateTradeAmountsFromQuote: () => void
  updateActiveAffiliateBps: (activeAffiliateBps: string) => void
}

// https://github.com/pmndrs/zustand/blob/main/src/vanilla.ts#L1
export type SetSwapperStoreAction<T> = {
  (
    partial:
      | T
      | Partial<T>
      | {
          (state: T): T | Partial<T>
        },
    replace?: boolean | undefined,
    action?: string | { type: unknown; value: unknown },
  ): void
}

export type SwapperState<T extends KnownChainIds = KnownChainIds> = SwapperStore<T> & SwapperAction
