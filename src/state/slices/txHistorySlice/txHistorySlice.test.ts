import { chainAdapters, UtxoAccountType } from '@shapeshiftoss/types'
import entries from 'lodash/entries'
import map from 'lodash/map'
import orderBy from 'lodash/orderBy'
import shuffle from 'lodash/shuffle'
import { mockStore } from 'test/mocks/store'
import { BtcSend, EthReceive, EthSend, testTxs } from 'test/mocks/txs'
import { store } from 'state/store'

import { selectLastNTxIds, Tx, txHistory } from './txHistorySlice'

describe('txHistorySlice', () => {
  it('returns empty object for initialState', async () => {
    expect(store.getState().txHistory).toEqual({
      byId: {},
      byAssetId: {},
      byAccountId: {},
      ids: []
    })
  })

  describe('onMessage', () => {
    it('can sort txs going into store', async () => {
      store.dispatch(txHistory.actions.clear())

      // shuffle txs before inserting them into the store
      const shuffledTxs = shuffle(testTxs)
      const ethCAIP2 = EthSend.caip2
      const accountSpecifier = `${ethCAIP2}:0xdef1cafe`
      shuffledTxs.forEach(tx =>
        store.dispatch(txHistory.actions.onMessage({ message: tx, accountSpecifier }))
      )
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

      const ethAccountSpecifier = `${EthSend.caip2}:0xdef1cafe`

      // new eth transaction (send)
      store.dispatch(
        txHistory.actions.onMessage({ message: EthSend, accountSpecifier: ethAccountSpecifier })
      )
      expect(Object.values(store.getState().txHistory.ids).length).toBe(1)

      // duplicate eth transaction (send)
      store.dispatch(
        txHistory.actions.onMessage({ message: EthSend, accountSpecifier: ethAccountSpecifier })
      )
      expect(Object.values(store.getState().txHistory.ids).length).toBe(1)

      // new eth transaction (receive)
      store.dispatch(
        txHistory.actions.onMessage({ message: EthReceive, accountSpecifier: ethAccountSpecifier })
      )
      expect(Object.values(store.getState().txHistory.ids).length).toBe(2)

      // eth data exists
      expect(store.getState().txHistory.byId[EthSend.txid]).toEqual(EthSend)
      expect(store.getState().txHistory.byId[EthReceive.txid]).toEqual(EthReceive)

      const segwitNativeAccountSpecifier = `${BtcSend.caip2}:zpub`

      // new btc transaction (send)
      store.dispatch(
        txHistory.actions.onMessage({
          message: BtcSend,
          accountSpecifier: segwitNativeAccountSpecifier
        })
      )
      expect(Object.values(store.getState().txHistory.ids).length).toBe(3)

      // duplicate btc transaction (send)
      store.dispatch(
        txHistory.actions.onMessage({
          message: BtcSend,
          accountSpecifier: segwitNativeAccountSpecifier
        })
      )
      expect(Object.values(store.getState().txHistory.ids).length).toBe(3)

      const segwitAccountSpecifier = `${BtcSend.caip2}:ypub`
      // const segwitNativeAccountSpecifier = `${BtcSend.caip2}:zpub`

      // same btc transaction, different account type (send)
      const BtcSendSegwit = { ...BtcSend, accountType: UtxoAccountType.SegwitP2sh }
      store.dispatch(
        txHistory.actions.onMessage({
          message: BtcSendSegwit,
          accountSpecifier: segwitAccountSpecifier
        })
      )
      expect(Object.values(store.getState().txHistory.ids).length).toBe(3)

      // btc data exists
      expect(store.getState().txHistory.byId[BtcSend.txid]).toEqual(BtcSend)
      expect(store.getState().txHistory.byId[BtcSendSegwit.txid]).toEqual(BtcSendSegwit)
    })

    it('should update existing transactions', async () => {
      const EthReceivePending = { ...EthReceive, status: chainAdapters.TxStatus.Pending }
      const ethAccountSpecifier = `${EthReceive.caip2}:0xdef1cafe`
      store.dispatch(
        txHistory.actions.onMessage({
          message: EthReceivePending,
          accountSpecifier: ethAccountSpecifier
        })
      )

      expect(store.getState().txHistory.byId[EthReceivePending.txid].status).toBe(
        chainAdapters.TxStatus.Pending
      )

      store.dispatch(
        txHistory.actions.onMessage({ message: EthReceive, accountSpecifier: ethAccountSpecifier })
      )
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
        byAccountId: {},
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
        byAccountId: {},
        // this array will always change on every new tx
        ids: ['a', 'b', 'c']
      }
    }
    const second = selectLastNTxIds(newState, 1)

    // toBe uses reference equality, not like isEqual deep equal check
    expect(first).toBe(second)
  })
})
