import type { Tx } from 'state/slices/txHistorySlice/txHistorySlice'

export const excludeTransaction = (tx: Tx): boolean =>
  Boolean(
    tx.data &&
      tx.data.parser === 'ibc' &&
      (tx.data.method === 'delegate' ||
        tx.data.method === 'begin_unbonding' ||
        tx.data.method === 'withdraw_delegator_reward' ||
        tx.data.method === 'begin_redelegate' ||
        tx.data.method === 'cancel_unbond' ||
        tx.data.method === 'set_withdraw_address'),
  )
