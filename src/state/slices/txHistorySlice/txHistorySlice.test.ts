import { chainAdapters, UtxoAccountType } from '@shapeshiftoss/types'
import { map, reverse } from 'lodash'
import { mockStore } from 'test/mocks/store'
import { BtcSend, ethereumTransactions, EthReceive, EthSend } from 'test/mocks/txs'
import { store } from 'state/store'

import { selectLastNTxIds, txHistory } from './txHistorySlice'

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
    const BtcSendSegwit = {
      ...BtcSend,
      accountType: UtxoAccountType.SegwitP2sh,
      txid: '974983662185eaa16f3a4a880f753c9085ef99cd8182d0135c90aa9d7193c6cf'
    }

    it('can sort txs going into store', async () => {
      // testTxs are in ascending order by time
      const transactions = reverse([...ethereumTransactions])
      // expected transaction order
      const expected = map(transactions, 'txid')

      store.dispatch(txHistory.actions.clear())

      // shuffle txs before inserting them into the store
      const shuffledTxs = reverse(transactions) // transactions in the wrong order
      const ethCAIP2 = EthSend.caip2
      const accountSpecifier = `${ethCAIP2}:0xdef1cafe`
      shuffledTxs.forEach(tx =>
        store.dispatch(txHistory.actions.onMessage({ message: tx, accountSpecifier }))
      )
      const history = store.getState().txHistory

      // The full list of transactions should be sorted by time
      expect(history.ids).toStrictEqual(expected)
      // The byAsset list should be sorted by time
      expect(history.byAssetId['eip155:1/slip44:60']).toStrictEqual(expected)
      // The byAccount list should be sorted by time
      expect(history.byAccountId['eip155:1:0xdef1cafe']).toStrictEqual(expected)
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

      // new btc transaction, different account type (send)
      store.dispatch(
        txHistory.actions.onMessage({
          message: BtcSendSegwit,
          accountSpecifier: segwitAccountSpecifier
        })
      )
      expect(Object.values(store.getState().txHistory.ids).length).toBe(4)

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

    it('should add txids by accountSpecifier', async () => {
      const ethAccountSpecifier = `${EthSend.caip2}:0xdef1cafe`
      const segwitNativeAccountSpecifier = `${BtcSend.caip2}:zpub`
      const segwitAccountSpecifier = `${BtcSend.caip2}:ypub`

      // new eth transaction (send)
      store.dispatch(
        txHistory.actions.onMessage({ message: EthSend, accountSpecifier: ethAccountSpecifier })
      )

      // new eth transaction (receive)
      store.dispatch(
        txHistory.actions.onMessage({ message: EthReceive, accountSpecifier: ethAccountSpecifier })
      )

      // new btc transaction (send)
      store.dispatch(
        txHistory.actions.onMessage({
          message: BtcSend,
          accountSpecifier: segwitNativeAccountSpecifier
        })
      )

      // new btc transaction, different account type (send)
      store.dispatch(
        txHistory.actions.onMessage({
          message: BtcSendSegwit,
          accountSpecifier: segwitAccountSpecifier
        })
      )

      expect(store.getState().txHistory.byAccountId[ethAccountSpecifier]).toStrictEqual([
        EthSend.txid,
        EthReceive.txid
      ])

      expect(store.getState().txHistory.byAccountId[segwitNativeAccountSpecifier]).toStrictEqual([
        BtcSend.txid
      ])

      expect(store.getState().txHistory.byAccountId[segwitAccountSpecifier]).toStrictEqual([
        BtcSendSegwit.txid
      ])
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
})
