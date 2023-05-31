import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { Asset } from 'lib/asset-service'
import type {
  BuildTradeInput,
  GetTradeQuoteInput,
  QuoteFeeData,
  SwapperName,
  TradeBase,
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
  | 'affiliateBps'
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
  trade: TradeBase<KnownChainIds>
  sellAsset: Asset
  tradeFeeSource: SwapperName
  feeAsset: Asset
}

export type AssetIdTradePair = { buyAssetId: AssetId; sellAssetId: AssetId }
