import type { Tx } from 'state/slices/txHistorySlice/txHistorySlice'

// @ts-ignore
export const excludeTransaction = (tx: Tx): boolean =>
  Boolean(
    tx.data &&
      // @ts-ignore
      tx.data.parser === 'cosmos' &&
      // @ts-ignore
      (tx.data.method === 'delegate' ||
          // @ts-ignore
        tx.data.method === 'begin_unbonding' ||
          // @ts-ignore
        tx.data.method === 'withdraw_delegator_reward' ||
          // @ts-ignore
        tx.data.method === 'begin_redelegate' ||
          // @ts-ignore
        tx.data.method === 'cancel_unbond' ||
          // @ts-ignore
        tx.data.method === 'set_withdraw_address'),
  )
//LOL fixme for the love of god