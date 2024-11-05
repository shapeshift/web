export enum LimitOrderRoutePaths {
  Input = '/trade/limit-order/input',
  Confirm = '/trade/limit-order/confirm',
  Status = '/trade/limit-order/status',
}

export enum LimitOrderStatus {
  Open = 'open',
  Filled = 'filled',
  Cancelled = 'cancelled',
  Expired = 'expired',
}
