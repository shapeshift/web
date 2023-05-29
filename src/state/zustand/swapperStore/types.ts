import type { AccountId } from '@shapeshiftoss/caip'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { AssetClickAction } from 'components/Trade/hooks/useTradeRoutes/types'
import type { DisplayFeeData, TradeAmountInputField } from 'components/Trade/types'
import type { Asset } from 'lib/asset-service'
import type { SwapperName, SwapperWithQuoteMetadata, Trade } from 'lib/swapper/api'

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
  action: TradeAmountInputField
  isSendMax: boolean
  amount: string
  receiveAddress?: string
  fees?: DisplayFeeData<C>
  trade?: Trade<C>
  activeSwapperWithMetadata?: SwapperWithQuoteMetadata
  availableSwappersWithMetadata?: SwapperWithQuoteMetadata[]
  activeAffiliateBps: string
  preferredSwapper?: SwapperName
}

type HandleAssetSelectionInput = { asset: Asset; action: AssetClickAction }

export type SwapperAction = {
  updateSelectedSellAssetAccountId: (accountId: SwapperStore['selectedSellAssetAccountId']) => void
  updateSelectedBuyAssetAccountId: (accountId: SwapperStore['selectedBuyAssetAccountId']) => void
  updateSellAssetAccountId: (accountId: SwapperStore['sellAssetAccountId']) => void
  updateBuyAssetAccountId: (accountId: SwapperStore['buyAssetAccountId']) => void
  updateSellAmountFiat: (sellAmountFiat: SwapperStore['sellAmountFiat']) => void
  updateBuyAmountFiat: (buyAmountFiat: SwapperStore['buyAmountFiat']) => void
  clearAmounts: () => void
  updateAction: (action: SwapperStore['action']) => void
  updateIsSendMax: (isSendMax: SwapperStore['isSendMax']) => void
  updateAmount: (amount: SwapperStore['amount']) => void
  updateReceiveAddress: (receiveAddress: SwapperStore['receiveAddress']) => void
  updateTrade: (trade: SwapperStore['trade']) => void
  updateAvailableSwappersWithMetadata: (
    availableSwappersWithMetadata: SwapperStore['availableSwappersWithMetadata'],
  ) => void
  handleSwitchAssets: () => void
  handleInputAmountChange: () => void
  handleAssetSelection: (handleAssetSelectionInput: HandleAssetSelectionInput) => void
  updateFees: (sellFeeAsset: Asset) => void
  updateTradeAmountsFromQuote: () => void
  updateActiveAffiliateBps: (activeAffiliateBps: string) => void
  updatePreferredSwapper: (preferredSwapper: SwapperStore['preferredSwapper']) => void
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
