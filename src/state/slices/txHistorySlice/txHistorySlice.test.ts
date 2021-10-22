import { ChainTypes } from '@shapeshiftoss/types'
import { BtcSend, EthReceive, EthSend } from 'jest/mocks/txs'
import { store } from 'state/store'

import { txHistory } from './txHistorySlice'

describe('txHistorySlice', () => {
  it('returns empty object for initialState', async () => {
    expect(store.getState().txHistory).toEqual({})
  })

  describe('onMessage', () => {
    it("adds tx's to object by chain", async () => {
      expect(store.getState().txHistory[ChainTypes.Ethereum]).toBeFalsy()
      await store.dispatch(txHistory.actions.onMessage({ message: EthSend }))
      expect(store.getState().txHistory[ChainTypes.Ethereum]).toBeTruthy()
      expect(store.getState().txHistory[ChainTypes.Ethereum].length).toBe(1)

      await store.dispatch(txHistory.actions.onMessage({ message: EthReceive }))
      expect(store.getState().txHistory[ChainTypes.Ethereum].length).toBe(2)

      expect(store.getState().txHistory[ChainTypes.Bitcoin]).toBeFalsy()
      await store.dispatch(txHistory.actions.onMessage({ message: BtcSend }))
      expect(store.getState().txHistory[ChainTypes.Bitcoin]).toBeTruthy()
      expect(store.getState().txHistory[ChainTypes.Bitcoin].length).toBe(1)
      expect(store.getState().txHistory[ChainTypes.Ethereum].length).toBe(2)
    })
  })
})
