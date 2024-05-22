import type { AccountId, AssetId } from '@shapeshiftoss/caip'

export enum ChangeAddressRoutePaths {
  Input = '/change-address/input',
  Confirm = '/change-address/confirm',
  Status = '/change-address/status',
}

export type ChangeAddressRouteProps = {
  headerComponent?: JSX.Element
}

export type RfoxChangeAddressQuote = {
  stakingAssetAccountId: AccountId
  stakingAssetId: AssetId
  newRuneAddress: string
}
