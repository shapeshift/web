import { Asset } from '@shapeshiftoss/asset-service'
import { ChainId } from '@shapeshiftoss/caip'
import { CowTrade, QuoteFeeData, Trade, TradeQuote } from '@shapeshiftoss/swapper'
import { KnownChainIds } from '@shapeshiftoss/types'
import { AccountSpecifier } from 'state/slices/portfolioSlice/portfolioSliceCommon'

export enum TradeAmountInputField {
  BUY_CRYPTO = 'BUY_CRYPTO',
  BUY_FIAT = 'BUY_FIAT',
  SELL_CRYPTO = 'SELL_CRYPTO',
  SELL_FIAT = 'SELL_FIAT',
}

export type TradeAsset = {
  asset?: Asset
  amount?: string
  fiatAmount?: string
}

export type DisplayFeeData<C extends ChainId> = QuoteFeeData<C> & { tradeFeeSource: string }

export type TradeState<C extends ChainId> = {
  sellTradeAsset: TradeAsset | undefined
  sellAssetAccount: AccountSpecifier | undefined
  selectedAssetAccount: AccountSpecifier | undefined
  buyTradeAsset: TradeAsset | undefined
  fiatSellAmount: string | undefined
  fiatBuyAmount: string | undefined
  sellAssetFiatRate: string
  buyAssetFiatRate: string
  feeAssetFiatRate: string
  fees?: DisplayFeeData<C>
  action: TradeAmountInputField | undefined
  isExactAllowance?: boolean
  quote: TradeQuote<C>
  trade: Trade<C> | CowTrade<C>
  quoteError: string | null // TODO: Deprecate
  amount: string | null
  receiveAddress: string | null // TODO: Implement
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
