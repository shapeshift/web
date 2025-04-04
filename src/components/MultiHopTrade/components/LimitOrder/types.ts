import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import type { Order } from '@shapeshiftoss/types'

export enum LimitOrderRoutePaths {
  Input = '/limit',
  Confirm = 'confirm',
  AllowanceApproval = 'allowance-approval',
  PlaceOrder = 'place-order',
  Orders = 'orders',
}

export type OrderToCancel = {
  accountId: AccountId
  sellAssetId: AssetId
  buyAssetId: AssetId
  order: Order
}
