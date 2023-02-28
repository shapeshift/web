import type { Asset } from '@shapeshiftoss/asset-service'
import type { AccountId, ChainId } from '@shapeshiftoss/caip'
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
  SET_RECEIVE_ADDRESS = 'SET_RECEIVE_ADDRESS',
  SET_QUOTE = 'SET_QUOTE',
  CLEAR_AMOUNTS = 'CLEAR_AMOUNTS',
  SET_BUY_ASSET = 'SET_BUY_ASSET',
  SET_SELL_ASSET = 'SET_SELL_ASSET',
  SET_TRADE_AMOUNTS = 'SET_TRADE_AMOUNTS',
}

export type SwapperAction =
  | {
      type: SwapperActionType.SET_VALUES
      payload: Partial<SwapperState>
    }
  | {
      type: SwapperActionType.SET_RECEIVE_ADDRESS
      payload: string | undefined
    }
  | {
      type: SwapperActionType.SET_QUOTE
      payload: TradeQuote<ChainId> | undefined
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
export type SwapperContextType<T extends KnownChainIds = KnownChainIds> = {
  state: SwapperState<T>
  dispatch: Dispatch<SwapperAction>
}
