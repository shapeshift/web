import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import type { Order } from '@shapeshiftoss/types'

export enum LimitOrderRoutePaths {
  Input = '/trade/limit-order/input',
  Confirm = '/trade/limit-order/confirm',
  AllowanceApproval = '/trade/limit-order/allowance-approval',
  PlaceOrder = '/trade/limit-order/place-order',
  Orders = '/trade/limit-order/orders',
}

export type OrderToCancel = {
  accountId: AccountId
  sellAssetId: AssetId
  buyAssetId: AssetId
  order: Order
}
