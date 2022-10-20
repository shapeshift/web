import type { Tx } from 'state/slices/txHistorySlice/txHistorySlice'

export const excludeTransaction = (tx: Tx): boolean => Boolean(tx.data?.parser === 'staking')
