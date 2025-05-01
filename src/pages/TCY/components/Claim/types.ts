import type { AccountId, AssetId } from '@shapeshiftoss/caip'

export type TcyClaimer = {
  l1_address: string
  amonut: string
  asset: string
}

export type Claim = {
  asset: string
  l1_address: string
  amountThorBaseUnit: string
  assetId: AssetId
  accountId: AccountId
}
