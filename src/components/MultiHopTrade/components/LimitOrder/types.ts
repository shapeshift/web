export enum LimitOrderRoutePaths {
  Input = '/trade/limit-order/input',
  Confirm = '/trade/limit-order/confirm',
  AllowanceApproval = '/trade/limit-order/allowance-approval',
  PlaceOrder = '/trade/limit-order/place-order',
  Orders = '/trade/limit-order/orders',
}

export enum LimitOrderStatus {
  Open = 'open',
  Filled = 'filled',
  Cancelled = 'cancelled',
  Expired = 'expired',
}
