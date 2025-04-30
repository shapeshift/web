import type { JSX } from 'react'

export enum TCYTabIndex {
  Stake,
  Unstake,
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

export type TCYRouteProps = {
  headerComponent?: JSX.Element
}

export enum TCYClaimRoute {
  Select = '/claim',
  Confirm = '/claim/confirm',
  Status = '/claim/status',
}

export enum TCYStakeRoute {
  Input = '/stake',
  Confirm = '/stake/confirm',
  Status = '/stake/status',
}

export enum TCYUnstakeRoute {
  Input = '/unstake',
  Confirm = '/unstake/confirm',
  Status = '/unstake/status',
}
