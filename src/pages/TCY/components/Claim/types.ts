import type { AccountId, AssetId } from '@shapeshiftoss/caip'

export type Claim = {
  asset: string
  l1_address: string
  amountThorBaseUnit: string
  assetId: AssetId
  accountId: AccountId
}
