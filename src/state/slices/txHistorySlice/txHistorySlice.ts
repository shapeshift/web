import { createSlice } from '@reduxjs/toolkit'
import { chainAdapters, ChainTypes } from '@shapeshiftoss/types'

export type Tx = chainAdapters.SubscribeTxsMessage<ChainTypes>

const initialState = {} as { [key: string]: Tx[] }

/**
 * Manage state of the txHistory slice
 *
 * If transaction already exists, update the value, otherwise add the new transaction
 */
const updateOrInsert = (txs: Array<Tx>, tx: Tx): Array<Tx> => {
  if (!txs) return [tx]
  const index = txs.findIndex(t => t.txid === tx.txid)
  txs[index] ? (txs[index] = tx) : txs.push(tx)
  return txs
}

export const txHistory = createSlice({
  name: 'txHistory',
  initialState,
  reducers: {
    onMessage(state, { payload }: { payload: { message: Tx } }) {
      const chain = payload.message.chain
      state[chain] = updateOrInsert(state[chain], payload.message)
    }
  }
})
