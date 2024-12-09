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

// Different to the CoW API OrderStatus enum. Includes `Unfillable` + `Unknown`, excludes `PRESIGNATURE_PENDING`.
// NOTE: The values of this enum are used for translation keys. Do Not edit without updating the translations!
export enum LimitOrderStatus {
  Open = 'open',
  Unfillable = 'unfillable',
  Fulfilled = 'fulfilled',
  Cancelled = 'cancelled',
  Expired = 'expired',
  Unknown = 'unknown',
}
