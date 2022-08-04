import { Tx } from 'state/slices/txHistorySlice/txHistorySlice'

export const includeTransaction = (tx: Tx): boolean =>
  tx.data?.parser !== 'cosmos' ||
  !(
    tx?.data.method === 'delegate' ||
    tx?.data.method === 'begin_unbonding' ||
    tx?.data.method === 'withdraw_delegator_reward'
  )
