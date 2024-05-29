import type { AccountId, AssetId } from '@shapeshiftoss/caip'

export enum ClaimRoutePaths {
  Select = '/claim/select',
  Confirm = '/claim/confirm',
  Status = '/claim/status',
}

export type ClaimRouteProps = {
  headerComponent?: JSX.Element
}

export type RfoxClaimQuote = {
  claimAssetAccountId: AccountId
  claimAssetId: AssetId
  claimAmountCryptoBaseUnit: string
}
