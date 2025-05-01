export enum NotificationType {
  Deposit = 'Deposit',
  Claim = 'Claim',
  Swap = 'Swap',
  Limit = 'Limit',
}

export enum NotificationStatus {
  Pending = 'Pending',
  Complete = 'Complete',
  Failed = 'Failed',
  ClaimAvailable = 'ClaimAvailable',
  Claimed = 'Claimed',
  Open = 'Open',
  Expired = 'Expired',
  Cancelled = 'Cancelled',
}
