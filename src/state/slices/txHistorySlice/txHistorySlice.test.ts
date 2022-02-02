import { chainAdapters, UtxoAccountType } from '@shapeshiftoss/types'
import { map, reverse } from 'lodash'
import { mockStore } from 'test/mocks/store'
import { BtcSend, ethereumTransactions, EthReceive, EthSend } from 'test/mocks/txs'
import { store } from 'state/store'

import { makeUniqueTxId, selectLastNTxIds, txHistory } from './txHistorySlice'

describe('txHistorySlice', () => {
  beforeAll(() => {
    jest.resetModules()
  })

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
      const ethCAIP2 = EthSend.caip2
      const accountSpecifier = `${ethCAIP2}:0xdef1cafe`
      // expected transaction order
      const expected = map(transactions, tx => makeUniqueTxId(tx, accountSpecifier))

      store.dispatch(txHistory.actions.clear())

      // shuffle txs before inserting them into the store
      const shuffledTxs = reverse(transactions) // transactions in the wrong order
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
      expect(store.getState().txHistory.byId[makeUniqueTxId(EthSend, ethAccountSpecifier)]).toEqual(
        EthSend
      )
      expect(
        store.getState().txHistory.byId[makeUniqueTxId(EthReceive, ethAccountSpecifier)]
      ).toEqual(EthReceive)

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
      expect(
        store.getState().txHistory.byId[makeUniqueTxId(BtcSend, segwitNativeAccountSpecifier)]
      ).toEqual(BtcSend)
      expect(
        store.getState().txHistory.byId[makeUniqueTxId(BtcSendSegwit, segwitAccountSpecifier)]
      ).toEqual(BtcSendSegwit)
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

      expect(
        store.getState().txHistory.byId[makeUniqueTxId(EthReceivePending, ethAccountSpecifier)]
          .status
      ).toBe(chainAdapters.TxStatus.Pending)

      store.dispatch(
        txHistory.actions.onMessage({ message: EthReceive, accountSpecifier: ethAccountSpecifier })
      )
      expect(
        store.getState().txHistory.byId[makeUniqueTxId(EthReceive, ethAccountSpecifier)].status
      ).toBe(chainAdapters.TxStatus.Confirmed)
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
        makeUniqueTxId(EthSend, ethAccountSpecifier),
        makeUniqueTxId(EthReceive, ethAccountSpecifier)
      ])

      expect(store.getState().txHistory.byAccountId[segwitNativeAccountSpecifier]).toStrictEqual([
        makeUniqueTxId(BtcSend, segwitNativeAccountSpecifier)
      ])

      expect(store.getState().txHistory.byAccountId[segwitAccountSpecifier]).toStrictEqual([
        makeUniqueTxId(BtcSendSegwit, segwitAccountSpecifier)
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
