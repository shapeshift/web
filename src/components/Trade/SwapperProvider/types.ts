import type { Asset } from '@shapeshiftoss/asset-service'
import type { AccountId } from '@shapeshiftoss/caip'
import type { CowTrade, Trade, TradeQuote } from '@shapeshiftoss/swapper'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { Dispatch } from 'react'
import type { DisplayFeeData, TradeAmountInputField, TradeAsset } from 'components/Trade/types'

export type SwapperState<C extends KnownChainIds = KnownChainIds> = {
  receiveAddress?: string
  quote?: TradeQuote<C>
  buyTradeAsset?: TradeAsset
  sellTradeAsset?: TradeAsset
  sellAssetAccountId?: AccountId | undefined
  buyAssetAccountId?: AccountId | undefined
  selectedSellAssetAccountId?: AccountId
  selectedBuyAssetAccountId?: AccountId
  fiatSellAmount?: string
  fiatBuyAmount?: string
  sellAssetFiatRate?: string
  buyAssetFiatRate?: string
  feeAssetFiatRate?: string
  fees?: DisplayFeeData<C>
  trade?: Trade<C> | CowTrade<C>
  action?: TradeAmountInputField | undefined
  isExactAllowance?: boolean
  slippage: string
  isSendMax: boolean
  amount: string
}

export enum SwapperActionType {
  SET_VALUES = 'SET_VALUES',
  CLEAR_AMOUNTS = 'CLEAR_AMOUNTS',
  SET_BUY_ASSET = 'SET_BUY_ASSET',
  SET_SELL_ASSET = 'SET_SELL_ASSET',
  SET_TRADE_AMOUNTS = 'SET_TRADE_AMOUNTS',
  TOGGLE_IS_EXACT_ALLOWANCE = 'TOGGLE_IS_EXACT_ALLOWANCE',
}

export type SwapperAction =
  | {
      type: SwapperActionType.SET_VALUES
      payload: Partial<SwapperState>
    }
  | { type: SwapperActionType.CLEAR_AMOUNTS }
  | {
      type: SwapperActionType.SET_BUY_ASSET | SwapperActionType.SET_SELL_ASSET
      payload: Asset | undefined
    }
  | {
      type: SwapperActionType.SET_TRADE_AMOUNTS
      payload: {
        buyAmountCryptoPrecision?: string
        sellAmountCryptoPrecision?: string
        fiatSellAmount?: string
        fiatBuyAmount?: string
      }
    }
  | { type: SwapperActionType.TOGGLE_IS_EXACT_ALLOWANCE }

export type SwapperContextType<T extends KnownChainIds = KnownChainIds> = {
  state: SwapperState<T>
  dispatch: Dispatch<SwapperAction>
}
