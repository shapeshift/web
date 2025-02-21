import type { AccountId } from '@shapeshiftmonorepo/caip'

export enum FoxWifHatClaimRoutePaths {
  Confirm = '/claim/confirm',
  Status = '/claim/status',
}

export type FoxWifHatClaimRouteProps = {
  accountId: AccountId
}
