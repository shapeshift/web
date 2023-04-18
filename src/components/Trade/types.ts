import { type Asset } from '@shapeshiftoss/asset-service'
import type { AssetId } from '@shapeshiftoss/caip'
import { type ChainId } from '@shapeshiftoss/caip'
import { type HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { SwapperName } from 'lib/swapper/api'
import {
  type BuildTradeInput,
  type GetTradeQuoteInput,
  type QuoteFeeData,
  type Trade,
  type TradeQuote,
} from 'lib/swapper/api'
import type { AccountMetadata } from 'state/slices/portfolioSlice/portfolioSliceCommon'

export enum TradeAmountInputField {
  BUY_CRYPTO = 'BUY_CRYPTO',
  BUY_FIAT = 'BUY_FIAT',
  SELL_CRYPTO = 'SELL_CRYPTO',
  SELL_FIAT = 'SELL_FIAT',
}

export type DisplayFeeData<C extends ChainId> = Omit<QuoteFeeData<C>, 'networkFee'> & {
  tradeFeeSource: SwapperName
  networkFeeCryptoHuman: string
}

export enum TradeRoutePaths {
  Input = '/trade/input',
  Confirm = '/trade/confirm',
  Approval = '/trade/approval',
  SellSelect = '/trade/select/sell',
  BuySelect = '/trade/select/buy',
}

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
  | 'affiliateBps'
>

export type GetFormFeesArgs = {
  trade: Trade<KnownChainIds> | TradeQuote<KnownChainIds>
  sellAsset: Asset
  tradeFeeSource: SwapperName
  feeAsset: Asset
}

export type AssetIdTradePair = { buyAssetId: AssetId; sellAssetId: AssetId }
