import { createSlice } from '@reduxjs/toolkit'
import { chainAdapters, ChainTypes } from '@shapeshiftoss/types'

export type Tx = chainAdapters.SubscribeTxsMessage<ChainTypes>

const initialState = {} as { [key: string]: Tx[] }

const updateSlice = (txs: Array<Tx>, tx: Tx): Array<Tx> => {
  if (!txs) return [tx]

  const index = txs.findIndex(t => t.txid === tx.txid)

  if (txs[index]) {
    txs[index] = tx
    return txs
  }

  return [tx, ...txs]
}

export const txHistory = createSlice({
  name: 'txHistory',
  initialState,
  reducers: {
    onMessage(state, { payload }: { payload: { message: Tx } }) {
      const chain = payload.message.chain
      state[chain] = updateSlice(state[chain], payload.message)
    }
  }
})
