import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import type { JSX } from 'react'

export enum ClaimRoutePaths {
  Select = '/claim',
  Confirm = '/claim/confirm',
  Status = '/claim/status',
}

export type ClaimRouteProps = {
  headerComponent?: JSX.Element
  setStepIndex: (index: number) => void
}

export type RfoxClaimQuote = {
  stakingAssetAccountId: AccountId
  stakingAssetId: AssetId
  stakingAmountCryptoBaseUnit: string
  index: number
}
