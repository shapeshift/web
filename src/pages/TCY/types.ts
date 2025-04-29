export enum TCYTabIndex {
  Stake,
  Unstake,
  Claim,
  ChangeAddress,
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
