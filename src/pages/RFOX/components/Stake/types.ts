import type { AccountId, AssetId } from '@shapeshiftoss/caip'

export enum StakeRoutePaths {
  Input = '/add/input',
  Confirm = '/add/confirm',
  Status = '/add/status',
}

export type StakeRouteProps = {
  headerComponent?: JSX.Element
}

export type RfoxStakingQuote = {
  stakingAssetAccountId: AccountId
  stakingAssetId: AssetId
  stakingAmountCryptoBaseUnit: string
  runeAddress: string
}
