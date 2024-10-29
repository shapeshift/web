export enum LimitOrderRoutePaths {
  Input = '/trade/limit-order/input',
  Confirm = '/trade/limit-order/confirm',
  Status = '/trade/limit-order/status',
}

export enum LimitOrderStatus {
  Open = 'Open',
  Filled = 'Filled',
  Cancelled = 'Cancelled',
  Expired = 'Expired',
}
