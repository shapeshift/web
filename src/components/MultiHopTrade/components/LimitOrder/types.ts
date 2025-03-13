import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import type { Order } from '@shapeshiftoss/types'

export enum LimitOrderRoutePaths {
  Input = '/limit',
  Confirm = '/limit/confirm',
  AllowanceApproval = '/limit/allowance-approval',
  PlaceOrder = '/limit/place-order',
  Orders = '/limit/orders',
}

export type OrderToCancel = {
  accountId: AccountId
  sellAssetId: AssetId
  buyAssetId: AssetId
  order: Order
}
