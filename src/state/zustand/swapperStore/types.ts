import type { AccountId } from '@shapeshiftoss/caip'
import type { CowTrade, Trade, TradeQuote } from '@shapeshiftoss/swapper'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { DisplayFeeData, TradeAmountInputField, TradeAsset } from 'components/Trade/types'

export type SwapperStore<C extends KnownChainIds = KnownChainIds> = {
  selectedSellAssetAccountId: AccountId | undefined
  selectedBuyAssetAccountId: AccountId | undefined
  sellAssetAccountId: AccountId | undefined
  buyAssetAccountId: AccountId | undefined
  quote: TradeQuote<C> | undefined
  fiatSellAmount: string
  fiatBuyAmount: string
  buyTradeAsset: TradeAsset
  sellTradeAsset: TradeAsset
  sellAssetFiatRate: string | undefined
  buyAssetFiatRate: string | undefined
  feeAssetFiatRate: string | undefined
  action: TradeAmountInputField
  isExactAllowance: boolean
  slippage: string
  isSendMax: boolean
  amount: string
  receiveAddress: string | undefined
  fees: DisplayFeeData<C> | undefined
  trade: Trade<C> | CowTrade<C> | undefined
}

type TradeAmounts = {
  buyAmountCryptoPrecision?: string
  sellAmountCryptoPrecision?: string
  fiatSellAmount?: string
  fiatBuyAmount?: string
}

export type SwapperAction = {
  updateSelectedSellAssetAccountId: (accountId: SwapperStore['selectedSellAssetAccountId']) => void
  updateSelectedBuyAssetAccountId: (accountId: SwapperStore['selectedBuyAssetAccountId']) => void
  updateSellAssetAccountId: (accountId: SwapperStore['sellAssetAccountId']) => void
  updateBuyAssetAccountId: (accountId: SwapperStore['buyAssetAccountId']) => void
  updateQuote: (quote: SwapperStore['quote']) => void
  updateFiatSellAmount: (fiatSellAmount: SwapperStore['fiatSellAmount']) => void
  updateFiatBuyAmount: (fiatBuyAmount: SwapperStore['fiatBuyAmount']) => void
  updateSellAssetFiatRate: (sellAssetFiatRate: SwapperStore['sellAssetFiatRate']) => void
  updateBuyAssetFiatRate: (buyAssetFiatRate: SwapperStore['buyAssetFiatRate']) => void
  updateFeeAssetFiatRate: (feeAssetFiatRate: SwapperStore['feeAssetFiatRate']) => void
  updateBuyTradeAsset: (buyTradeAsset: SwapperStore['buyTradeAsset']) => void
  updateSellTradeAsset: (sellTradeAsset: SwapperStore['sellTradeAsset']) => void
  updateTradeAmounts: (tradeAmounts: TradeAmounts) => void
  clearAmounts: () => void
  updateAction: (action: SwapperStore['action']) => void
  updateIsExactAllowance: (isExactAllowance: SwapperStore['isExactAllowance']) => void
  updateSlippage: (slippage: SwapperStore['slippage']) => void
  updateIsSendMax: (isSendMax: SwapperStore['isSendMax']) => void
  updateAmount: (amount: SwapperStore['amount']) => void
  updateReceiveAddress: (receiveAddress: SwapperStore['receiveAddress']) => void
  toggleIsExactAllowance: () => void
  updateFees: (fees: SwapperStore['fees']) => void
  updateTrade: (trade: SwapperStore['trade']) => void
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
