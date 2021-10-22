import { createSlice } from '@reduxjs/toolkit'
import { chainAdapters, ChainTypes } from '@shapeshiftoss/types'

export type Tx = chainAdapters.SubscribeTxsMessage<ChainTypes>

const initialState = {} as { [key: string]: Tx[] }

export const txHistory = createSlice({
  name: 'txHistory',
  initialState,
  reducers: {
    onMessage(state, { payload }: { payload: { message: Tx } }) {
      const chain = payload.message.chain
      state[chain] = state[chain] ? [...state[chain], payload.message] : [payload.message]
    }
  }
})
