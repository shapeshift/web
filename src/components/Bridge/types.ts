import { AssetId } from '@shapeshiftoss/caip'

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
  implementations?: {
    [key in string]: BridgeChain
  }
}

export type BridgeProps = {
  defaultBuyAssetId: AssetId
}

export type BridgeState = {
  asset: BridgeAsset | undefined
  fiatAmount: string
  cryptoAmount: string
  fromChain: BridgeChain | undefined
  toChain: BridgeChain | undefined
  address: string | undefined
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
