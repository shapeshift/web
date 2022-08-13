import { Asset } from '@shapeshiftoss/asset-service'
import { AssetId, ChainId } from '@shapeshiftoss/caip'
import { QuoteFeeData, Trade, TradeQuote } from '@shapeshiftoss/swapper'
import { CowTrade } from '@shapeshiftoss/swapper'

export enum TradeAmountInputField {
  BUY = 'BUY',
  SELL = 'SELL',
  FIAT = 'FIAT',
}

export type TradeAsset = {
  asset?: Asset
  amount?: string
}

export type TradeProps = {
  defaultBuyAssetId: AssetId
}

export type DisplayFeeData<C extends ChainId> = QuoteFeeData<C> & { tradeFeeSource: string }

export type TradeState<C extends ChainId> = {
  sellAsset: TradeAsset | undefined
  buyAsset: TradeAsset | undefined
  fiatSellAmount: string | undefined
  sellAssetFiatRate: string
  buyAssetFiatRate: string
  feeAssetFiatRate: string
  fees?: DisplayFeeData<C>
  action?: TradeAmountInputField
  quote: TradeQuote<C>
  trade: Trade<C> | CowTrade<C>
  quoteError: string | null
}

export enum TradeRoutePaths {
  Input = '/trade/input',
  Confirm = '/trade/confirm',
  Approval = '/trade/approval',
  SellSelect = '/trade/select/sell',
  BuySelect = '/trade/select/buy',
}
