import { type Asset } from '@shapeshiftoss/asset-service'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { type ChainId } from '@shapeshiftoss/caip'
import { type HDWallet } from '@shapeshiftoss/hdwallet-core'
import {
  type BuildTradeInput,
  type CowTrade,
  type GetTradeQuoteInput,
  type QuoteFeeData,
  type Trade,
  type TradeQuote,
} from '@shapeshiftoss/swapper'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { AccountMetadata } from 'state/slices/portfolioSlice/portfolioSliceCommon'

export enum TradeAmountInputField {
  BUY_CRYPTO = 'BUY_CRYPTO',
  BUY_FIAT = 'BUY_FIAT',
  SELL_CRYPTO = 'SELL_CRYPTO',
  SELL_FIAT = 'SELL_FIAT',
}

export type TradeAsset = {
  asset?: Asset
  amountCryptoPrecision?: string
  fiatAmount?: string
}

export type DisplayFeeData<C extends ChainId> = Omit<QuoteFeeData<C>, 'networkFee'> & {
  tradeFeeSource: string
  networkFeeCryptoHuman: string
}

export type TradeState<C extends ChainId> = {
  sellTradeAsset: TradeAsset | undefined
  sellAssetAccountId: AccountId | undefined
  buyAssetAccountId: AccountId | undefined
  selectedSellAssetAccountId?: AccountId
  selectedBuyAssetAccountId?: AccountId
  buyTradeAsset: TradeAsset | undefined
  fiatSellAmount: string
  fiatBuyAmount: string
  sellAssetFiatRate?: string
  buyAssetFiatRate?: string
  feeAssetFiatRate?: string
  fees?: DisplayFeeData<C>
  action: TradeAmountInputField | undefined
  isExactAllowance?: boolean
  quote?: TradeQuote<C>
  trade?: Trade<C> | CowTrade<C>
  /** @deprecated use native react hook form errors instead */
  quoteError: string | null
  amount: string
  receiveAddress: string | null // TODO: Implement
  slippage: string
  isSendMax: boolean
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

export type SupportedSwappingChain =
  | KnownChainIds.EthereumMainnet
  | KnownChainIds.AvalancheMainnet
  | KnownChainIds.OsmosisMainnet
  | KnownChainIds.CosmosMainnet

export type GetReceiveAddressArgs = {
  asset: Asset
  wallet: HDWallet | null
  accountMetadata: AccountMetadata
}

export type TradeQuoteInputCommonArgs = Pick<
  GetTradeQuoteInput,
  | 'sellAmountBeforeFeesCryptoBaseUnit'
  | 'sellAsset'
  | 'buyAsset'
  | 'sendMax'
  | 'receiveAddress'
  | 'accountNumber'
>

export type BuildTradeInputCommonArgs = Pick<
  BuildTradeInput,
  | 'sellAmountBeforeFeesCryptoBaseUnit'
  | 'sellAsset'
  | 'buyAsset'
  | 'sendMax'
  | 'receiveAddress'
  | 'wallet'
  | 'slippage'
>

export type GetFormFeesArgs = {
  trade: Trade<KnownChainIds> | TradeQuote<KnownChainIds>
  sellAsset: Asset
  tradeFeeSource: string
  feeAsset: Asset
}

export type AssetIdTradePair = { buyAssetId: AssetId; sellAssetId: AssetId }
