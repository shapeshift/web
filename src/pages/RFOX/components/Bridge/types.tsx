import type { AccountId, AssetId } from '@shapeshiftoss/caip'

export enum BridgeRoutePaths {
  Confirm = '/bridge/confirm',
  Status = '/bridge/status',
}

export type BridgeRouteProps = {
  headerComponent?: JSX.Element
}

export type RfoxBridgeQuote = {
  sellAssetAccountId: AccountId
  buyAssetAccountId: AccountId
  sellAssetId: AssetId
  buyAssetId: AssetId
  bridgeAmountCryptoBaseUnit: string
}
