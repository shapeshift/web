import { AssetId, ChainId } from '@shapeshiftoss/caip'
import { QuoteFeeData, Trade, TradeQuote } from '@shapeshiftoss/swapper'
import { Asset } from '@shapeshiftoss/types'

export enum BridgeAmountInputField {
  BUY = 'BUY',
  SELL = 'SELL',
  FIAT = 'FIAT',
}

export type BridgeChain = {
  name: string
  balance: string
  fiatBalance: string
  color: string
}

export type BridgeAsset = {
  assetId: string
  symbol: string
  balance: string
  icon: string
  implmentations?: {
    [key in string]: BridgeChain
  }
}

export type BridgeProps = {
  defaultBuyAssetId: AssetId
}

export type DisplayFeeData<C extends ChainId> = QuoteFeeData<C> & { tradeFeeSource: string }

export type BridgeState = {
  asset: BridgeAsset | undefined
  fiatAmount: string | undefined
  cryptoAmount: string | undefined
  fromChain: BridgeChain | undefined
  toChain: BridgeChain | undefined
}

export enum BridgeRoutePaths {
  Input = '/trade/input',
  Confirm = '/trade/confirm',
  Approval = '/trade/approval',
  SellSelect = '/trade/select/sell',
  SelectAsset = '/trade/select/asset',
  ChainFromSelect = '/trade/select/chain/from',
  ChainToSelect = '/trade/select/chain/to',
  Status = '/trade/status',
}
