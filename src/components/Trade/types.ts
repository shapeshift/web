import { Asset } from '@shapeshiftoss/asset-service'
import { AssetId, ChainId } from '@shapeshiftoss/caip'
import { CowTrade, QuoteFeeData, Trade, TradeQuote } from '@shapeshiftoss/swapper'
import { KnownChainIds } from '@shapeshiftoss/types'
import { AccountSpecifier } from 'state/slices/portfolioSlice/portfolioSliceCommon'

export enum TradeAmountInputField {
  BUY = 'BUY',
  SELL = 'SELL',
  FIAT = 'FIAT',
}

export type TradeAsset = {
  asset?: Asset
  amount?: string
  fiatAmount?: string
}

export type TradeProps = {
  defaultBuyAssetId: AssetId
}

export type DisplayFeeData<C extends ChainId> = QuoteFeeData<C> & { tradeFeeSource: string }

export type TradeState<C extends ChainId> = {
  sellTradeAsset: TradeAsset | undefined
  sellAssetAccount: AccountSpecifier | undefined
  selectedAssetAccount: AccountSpecifier | undefined
  buyTradeAsset: TradeAsset | undefined
  fiatSellAmount: string | undefined
  sellAssetFiatRate: string
  buyAssetFiatRate: string
  feeAssetFiatRate: string
  fees?: DisplayFeeData<C>
  action: TradeAmountInputField | undefined
  isExactAllowance?: boolean
  quote: TradeQuote<C>
  trade: Trade<C> | CowTrade<C>
  quoteError: string | null // Deprecate
  amount: string | null
  receiveAddress: string | null // Implement
}

export type TS<T extends KnownChainIds = KnownChainIds> = TradeState<T>

export enum TradeRoutePaths {
  Input = '/trade/input',
  Confirm = '/trade/confirm',
  Approval = '/trade/approval',
  SellSelect = '/trade/select/sell',
  BuySelect = '/trade/select/buy',
  AccountSelect = '/trade/select/account',
}
