import { chainAdapters, UtxoAccountType } from '@shapeshiftoss/types'
import entries from 'lodash/entries'
import map from 'lodash/map'
import orderBy from 'lodash/orderBy'
import shuffle from 'lodash/shuffle'
import { store } from 'state/store'

import { mockStore } from '../../../test/mocks/store'
import { BtcSend, EthReceive, EthSend, testTxs } from '../../../test/mocks/txs'
import { selectLastNTxIds, Tx, txHistory } from './txHistorySlice'

describe('txHistorySlice', () => {
  it('returns empty object for initialState', async () => {
    expect(store.getState().txHistory).toEqual({ byId: {}, byAssetId: {}, ids: [] })
  })

  describe('onMessage', () => {
    it('can sort txs going into store', async () => {
      store.dispatch(txHistory.actions.clear())

      // shuffle txs before inserting them into the store
      const shuffledTxs = shuffle(testTxs)
      shuffledTxs.forEach(tx => store.dispatch(txHistory.actions.onMessage({ message: tx })))
      const history = store.getState().txHistory
      // these ids should be sorted by the reducer going in
      const ids = history.ids

      // this is the same sorting logic, by block time descending
      const txEntriesById = entries(history.byId)
      const sorted = orderBy(txEntriesById, ([_id, tx]: [string, Tx]) => tx.blockTime, ['desc'])
      const sortedIds = map(sorted, ([id]) => id)

      expect(ids).toEqual(sortedIds)
    })

    it('should add new transactions', async () => {
      store.dispatch(txHistory.actions.clear())

      // new eth transaction (send)
      store.dispatch(txHistory.actions.onMessage({ message: EthSend }))
      expect(Object.values(store.getState().txHistory.ids).length).toBe(1)

      // duplicate eth transaction (send)
      store.dispatch(txHistory.actions.onMessage({ message: EthSend }))
      expect(Object.values(store.getState().txHistory.ids).length).toBe(1)

      // new eth transaction (receive)
      store.dispatch(txHistory.actions.onMessage({ message: EthReceive }))
      expect(Object.values(store.getState().txHistory.ids).length).toBe(2)

      // eth data exists
      expect(store.getState().txHistory.byId[EthSend.txid]).toEqual(EthSend)
      expect(store.getState().txHistory.byId[EthReceive.txid]).toEqual(EthReceive)

      // new btc transaction (send)
      store.dispatch(txHistory.actions.onMessage({ message: BtcSend }))
      expect(Object.values(store.getState().txHistory.ids).length).toBe(3)

      // duplicate btc transaction (send)
      store.dispatch(txHistory.actions.onMessage({ message: BtcSend }))
      expect(Object.values(store.getState().txHistory.ids).length).toBe(3)

      // same btc transaction, different account type (send)
      const BtcSendSegwit = { ...BtcSend, accountType: UtxoAccountType.SegwitNative }
      store.dispatch(txHistory.actions.onMessage({ message: BtcSendSegwit }))
      expect(Object.values(store.getState().txHistory.ids).length).toBe(3)

      // btc data exists
      expect(store.getState().txHistory.byId[BtcSend.txid]).toEqual(BtcSend)
      expect(store.getState().txHistory.byId[BtcSendSegwit.txid]).toEqual(BtcSendSegwit)
    })

    it('should update existing transactions', async () => {
      const EthReceivePending = { ...EthReceive, status: chainAdapters.TxStatus.Pending }
      store.dispatch(txHistory.actions.onMessage({ message: EthReceivePending }))

      expect(store.getState().txHistory.byId[EthReceivePending.txid].status).toBe(
        chainAdapters.TxStatus.Pending
      )

      store.dispatch(txHistory.actions.onMessage({ message: EthReceive }))
      expect(store.getState().txHistory.byId[EthReceive.txid].status).toBe(
        chainAdapters.TxStatus.Confirmed
      )
    })
  })
})

describe('selectLastNTxIds', () => {
  it('should memoize', () => {
    const state = {
      ...mockStore,
      txHistory: {
        byId: {},
        byAssetId: {},
        ids: ['a', 'b']
      }
    }
    const first = selectLastNTxIds(state, 1)

    // redux will replace the array on update
    const newState = {
      ...mockStore,
      txHistory: {
        byId: {},
        byAssetId: {},
        // this array will always change on every new tx
        ids: ['a', 'b', 'c']
      }
    }
    const second = selectLastNTxIds(newState, 1)

    // toBe uses reference equality, not like isEqual deep equal check
    expect(first).toBe(second)
  })
})
