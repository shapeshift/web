import { btcAssetId, ethAssetId } from '@shapeshiftoss/caip'
import { UtxoAccountType } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { map, reverse } from 'lodash'
import { mockStore } from 'test/mocks/store'
import { BtcSend, ethereumTransactions, EthReceive, EthSend } from 'test/mocks/txs'
import { store } from 'state/store'

import { selectLastNTxIds } from './selectors'
import type { RebasesState, TxHistory, TxsState } from './txHistorySlice'
import { txHistory } from './txHistorySlice'
import { serializeTxIndex } from './utils'

describe('txHistorySlice', () => {
  const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => void 0)
  beforeAll(() => {
    jest.resetModules()
  })
  afterAll(() => consoleInfoSpy.mockRestore())

  it('returns empty object for initialState', () => {
    expect(store.getState().txHistory).toEqual({
      txs: {
        byId: {},
        byAccountIdAssetId: {},
        ids: [],
      },
      rebases: {
        byAccountIdAssetId: {},
        ids: [],
        byId: {},
      },
    })
  })

  describe('onMessage', () => {
    const BtcSendSegwit = {
      ...BtcSend,
      accountType: UtxoAccountType.SegwitP2sh,
      txid: '974983662185eaa16f3a4a880f753c9085ef99cd8182d0135c90aa9d7193c6cf',
    }

    it('can sort txs going into store', () => {
      // testTxs are in ascending order by time
      const transactions = reverse([...ethereumTransactions])
      const ethChainId = EthSend.chainId
      const accountId = `${ethChainId}:0xdef1cafe`
      // expected transaction order
      const expected = map(transactions, tx => serializeTxIndex(accountId, tx.txid, tx.address))

      store.dispatch(txHistory.actions.clear())

      // shuffle txs before inserting them into the store
      const shuffledTxs = reverse(transactions) // transactions in the wrong order
      shuffledTxs.forEach(tx =>
        store.dispatch(txHistory.actions.onMessage({ message: tx, accountId })),
      )
      const history = store.getState().txHistory.txs

      // The full list of transactions should be sorted by time
      expect(history.ids).toStrictEqual(expected)
    })

    it('should add new transactions', () => {
      store.dispatch(txHistory.actions.clear())

      const ethAccountId = `${EthSend.chainId}:0xdef1cafe`

      // new eth transaction (send)
      store.dispatch(txHistory.actions.onMessage({ message: EthSend, accountId: ethAccountId }))
      expect(Object.values(store.getState().txHistory.txs.ids).length).toBe(1)

      // duplicate eth transaction (send)
      store.dispatch(txHistory.actions.onMessage({ message: EthSend, accountId: ethAccountId }))
      expect(Object.values(store.getState().txHistory.txs.ids).length).toBe(1)

      // new eth transaction (receive)
      store.dispatch(txHistory.actions.onMessage({ message: EthReceive, accountId: ethAccountId }))
      expect(Object.values(store.getState().txHistory.txs.ids).length).toBe(2)

      // eth data exists
      expect(
        store.getState().txHistory.txs.byId[
          serializeTxIndex(ethAccountId, EthSend.txid, EthSend.address)
        ],
      ).toEqual(EthSend)
      expect(
        store.getState().txHistory.txs.byId[
          serializeTxIndex(ethAccountId, EthReceive.txid, EthReceive.address)
        ],
      ).toEqual(EthReceive)

      const segwitNativeAccountId = `${BtcSend.chainId}:zpub`

      // new btc transaction (send)
      store.dispatch(
        txHistory.actions.onMessage({
          message: BtcSend,
          accountId: segwitNativeAccountId,
        }),
      )
      expect(Object.values(store.getState().txHistory.txs.ids).length).toBe(3)

      // duplicate btc transaction (send)
      store.dispatch(
        txHistory.actions.onMessage({
          message: BtcSend,
          accountId: segwitNativeAccountId,
        }),
      )
      expect(Object.values(store.getState().txHistory.txs.ids).length).toBe(3)

      const segwitAccountId = `${BtcSend.chainId}:ypub`

      // new btc transaction, different account type (send)
      store.dispatch(
        txHistory.actions.onMessage({
          message: BtcSendSegwit,
          accountId: segwitAccountId,
        }),
      )
      expect(Object.values(store.getState().txHistory.txs.ids).length).toBe(4)

      // btc data exists
      expect(
        store.getState().txHistory.txs.byId[
          serializeTxIndex(segwitNativeAccountId, BtcSend.txid, BtcSend.address)
        ],
      ).toEqual(BtcSend)
      expect(
        store.getState().txHistory.txs.byId[
          serializeTxIndex(segwitAccountId, BtcSendSegwit.txid, BtcSendSegwit.address)
        ],
      ).toEqual(BtcSendSegwit)
    })

    it('should update existing transactions', () => {
      const EthReceivePending = { ...EthReceive, status: TxStatus.Pending }
      const ethAccountId = `${EthReceive.chainId}:0xdef1cafe`
      store.dispatch(
        txHistory.actions.onMessage({
          message: EthReceivePending,
          accountId: ethAccountId,
        }),
      )

      expect(
        store.getState().txHistory.txs.byId[
          serializeTxIndex(ethAccountId, EthReceivePending.txid, EthReceivePending.address)
        ].status,
      ).toBe(TxStatus.Pending)

      store.dispatch(txHistory.actions.onMessage({ message: EthReceive, accountId: ethAccountId }))
      expect(
        store.getState().txHistory.txs.byId[
          serializeTxIndex(ethAccountId, EthReceive.txid, EthReceive.address)
        ].status,
      ).toBe(TxStatus.Confirmed)
    })

    it('should add txids by accountIdAssetId', () => {
      const ethAccountId = `${EthSend.chainId}:0xdef1cafe`
      const segwitNativeAccountId = `${BtcSend.chainId}:zpub`
      const segwitAccountId = `${BtcSend.chainId}:ypub`

      // new eth transaction (send)
      store.dispatch(txHistory.actions.onMessage({ message: EthSend, accountId: ethAccountId }))

      // new eth transaction (receive)
      store.dispatch(txHistory.actions.onMessage({ message: EthReceive, accountId: ethAccountId }))

      // new btc transaction (send)
      store.dispatch(
        txHistory.actions.onMessage({
          message: BtcSend,
          accountId: segwitNativeAccountId,
        }),
      )

      // new btc transaction, different account type (send)
      store.dispatch(
        txHistory.actions.onMessage({
          message: BtcSendSegwit,
          accountId: segwitAccountId,
        }),
      )

      expect(
        store.getState().txHistory.txs.byAccountIdAssetId[ethAccountId]?.[ethAssetId],
      ).toStrictEqual([
        serializeTxIndex(ethAccountId, EthSend.txid, EthSend.address),
        serializeTxIndex(ethAccountId, EthReceive.txid, EthReceive.address),
      ])

      expect(
        store.getState().txHistory.txs.byAccountIdAssetId[segwitNativeAccountId]?.[btcAssetId],
      ).toStrictEqual([serializeTxIndex(segwitNativeAccountId, BtcSend.txid, BtcSend.address)])

      expect(
        store.getState().txHistory.txs.byAccountIdAssetId?.[segwitAccountId]?.[btcAssetId],
      ).toStrictEqual([
        serializeTxIndex(segwitAccountId, BtcSendSegwit.txid, BtcSendSegwit.address),
      ])
    })
  })

  describe('selectLastNTxIds', () => {
    it('should memoize', () => {
      const txs: TxsState = {
        byId: {},
        byAccountIdAssetId: {},
        ids: ['a', 'b'],
      }
      const rebases: RebasesState = {
        byAccountIdAssetId: {},
        ids: [],
        byId: {},
      }

      const txHistory: TxHistory = { txs, rebases }

      const state = {
        ...mockStore,
        txHistory,
      }
      const first = selectLastNTxIds(state, 1)

      const newTxHistory: TxHistory = {
        txs: {
          ...txs,
          // this array will always change on every new tx
          ids: ['a', 'b', 'c'],
        },
        rebases,
      }

      // redux will replace the array on update
      const newState = {
        ...mockStore,
        txHistory: newTxHistory,
      }
      const second = selectLastNTxIds(newState, 1)

      // toBe uses reference equality, not like isEqual deep equal check
      expect(first).toBe(second)
    })
  })
})
