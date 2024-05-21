import type { AccountId, AssetId } from '@shapeshiftoss/caip'

export enum UnstakeRoutePaths {
  Input = '/remove/input',
  Confirm = '/remove/confirm',
  Status = '/remove/status',
}

export type UnstakeRouteProps = {
  headerComponent?: JSX.Element
}

export type RfoxUnstakingQuote = {
  stakingAssetAccountId: AccountId
  stakingAssetId: AssetId
  unstakingAmountCryptoBaseUnit: string
}
