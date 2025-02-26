import type { AccountId } from '@shapeshiftoss/caip'

export enum FoxWifHatClaimRoutePaths {
  Confirm = '/claim/confirm',
  Status = '/claim/status',
}

export type FoxWifHatClaimRouteProps = {
  accountId: AccountId
}
