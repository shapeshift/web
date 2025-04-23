export enum TCYTabIndex {
  Stake = 0,
  Unstake = 1,
  Claim = 2,
  ChangeAddress = 3,
}

export enum TransactionRowType {
  Stake = 'stake',
  Unstake = 'unstake',
  Claim = 'claim',
  Reward = 'reward',
}

export enum TransactionStatus {
  Pending = 'pending',
  Success = 'success',
  Failed = 'failed',
}

export type TransactionRow = {
  type: TransactionRowType
  amount: string
  txHash: string
  status: TransactionStatus
  timestamp: number
}
