import { UtxoAccountType } from '@keepkey/types'
import { TxStatus } from '@keepkey/unchained-client'
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

  it('returns empty object for initialState', async () => {
    expect(store.getState().txHistory).toEqual({
      txs: {
        byId: {},
        byAssetId: {},
        byAccountId: {},
        ids: [],
        status: 'loading',
      },
      rebases: {
        byAssetId: {},
        byAccountId: {},
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

    it('can sort txs going into store', async () => {
      // testTxs are in ascending order by time
      const transactions = reverse([...ethereumTransactions])
      const ethChainId = EthSend.chainId
      const accountSpecifier = `${ethChainId}:0xdef1cafe`
      // expected transaction order
      const expected = map(transactions, tx =>
        serializeTxIndex(accountSpecifier, tx.txid, tx.address),
      )

      store.dispatch(txHistory.actions.clear())

      // shuffle txs before inserting them into the store
      const shuffledTxs = reverse(transactions) // transactions in the wrong order
      shuffledTxs.forEach(tx =>
        store.dispatch(txHistory.actions.onMessage({ message: tx, accountSpecifier })),
      )
      const history = store.getState().txHistory.txs

      // The full list of transactions should be sorted by time
      expect(history.ids).toStrictEqual(expected)
      // The byAsset list should be sorted by time
      expect(history.byAssetId['eip155:1/slip44:60']).toStrictEqual(expected)
      // The byAccount list should be sorted by time
      expect(history.byAccountId['eip155:1:0xdef1cafe']).toStrictEqual(expected)
    })

    it('should add new transactions', async () => {
      store.dispatch(txHistory.actions.clear())

      const ethAccountSpecifier = `${EthSend.chainId}:0xdef1cafe`

      // new eth transaction (send)
      store.dispatch(
        txHistory.actions.onMessage({ message: EthSend, accountSpecifier: ethAccountSpecifier }),
      )
      expect(Object.values(store.getState().txHistory.txs.ids).length).toBe(1)

      // duplicate eth transaction (send)
      store.dispatch(
        txHistory.actions.onMessage({ message: EthSend, accountSpecifier: ethAccountSpecifier }),
      )
      expect(Object.values(store.getState().txHistory.txs.ids).length).toBe(1)

      // new eth transaction (receive)
      store.dispatch(
        txHistory.actions.onMessage({ message: EthReceive, accountSpecifier: ethAccountSpecifier }),
      )
      expect(Object.values(store.getState().txHistory.txs.ids).length).toBe(2)

      // eth data exists
      expect(
        store.getState().txHistory.txs.byId[
          serializeTxIndex(ethAccountSpecifier, EthSend.txid, EthSend.address)
        ],
      ).toEqual(EthSend)
      expect(
        store.getState().txHistory.txs.byId[
          serializeTxIndex(ethAccountSpecifier, EthReceive.txid, EthReceive.address)
        ],
      ).toEqual(EthReceive)

      const segwitNativeAccountSpecifier = `${BtcSend.chainId}:zpub`

      // new btc transaction (send)
      store.dispatch(
        txHistory.actions.onMessage({
          message: BtcSend,
          accountSpecifier: segwitNativeAccountSpecifier,
        }),
      )
      expect(Object.values(store.getState().txHistory.txs.ids).length).toBe(3)

      // duplicate btc transaction (send)
      store.dispatch(
        txHistory.actions.onMessage({
          message: BtcSend,
          accountSpecifier: segwitNativeAccountSpecifier,
        }),
      )
      expect(Object.values(store.getState().txHistory.txs.ids).length).toBe(3)

      const segwitAccountSpecifier = `${BtcSend.chainId}:ypub`

      // new btc transaction, different account type (send)
      store.dispatch(
        txHistory.actions.onMessage({
          message: BtcSendSegwit,
          accountSpecifier: segwitAccountSpecifier,
        }),
      )
      expect(Object.values(store.getState().txHistory.txs.ids).length).toBe(4)

      // btc data exists
      expect(
        store.getState().txHistory.txs.byId[
          serializeTxIndex(segwitNativeAccountSpecifier, BtcSend.txid, BtcSend.address)
        ],
      ).toEqual(BtcSend)
      expect(
        store.getState().txHistory.txs.byId[
          serializeTxIndex(segwitAccountSpecifier, BtcSendSegwit.txid, BtcSendSegwit.address)
        ],
      ).toEqual(BtcSendSegwit)
    })

    it('should update existing transactions', async () => {
      const EthReceivePending = { ...EthReceive, status: TxStatus.Pending }
      const ethAccountSpecifier = `${EthReceive.chainId}:0xdef1cafe`
      store.dispatch(
        txHistory.actions.onMessage({
          message: EthReceivePending,
          accountSpecifier: ethAccountSpecifier,
        }),
      )

      expect(
        store.getState().txHistory.txs.byId[
          serializeTxIndex(ethAccountSpecifier, EthReceivePending.txid, EthReceivePending.address)
        ].status,
      ).toBe(TxStatus.Pending)

      store.dispatch(
        txHistory.actions.onMessage({ message: EthReceive, accountSpecifier: ethAccountSpecifier }),
      )
      expect(
        store.getState().txHistory.txs.byId[
          serializeTxIndex(ethAccountSpecifier, EthReceive.txid, EthReceive.address)
        ].status,
      ).toBe(TxStatus.Confirmed)
    })

    it('should add txids by accountSpecifier', async () => {
      const ethAccountSpecifier = `${EthSend.chainId}:0xdef1cafe`
      const segwitNativeAccountSpecifier = `${BtcSend.chainId}:zpub`
      const segwitAccountSpecifier = `${BtcSend.chainId}:ypub`

      // new eth transaction (send)
      store.dispatch(
        txHistory.actions.onMessage({ message: EthSend, accountSpecifier: ethAccountSpecifier }),
      )

      // new eth transaction (receive)
      store.dispatch(
        txHistory.actions.onMessage({ message: EthReceive, accountSpecifier: ethAccountSpecifier }),
      )

      // new btc transaction (send)
      store.dispatch(
        txHistory.actions.onMessage({
          message: BtcSend,
          accountSpecifier: segwitNativeAccountSpecifier,
        }),
      )

      // new btc transaction, different account type (send)
      store.dispatch(
        txHistory.actions.onMessage({
          message: BtcSendSegwit,
          accountSpecifier: segwitAccountSpecifier,
        }),
      )

      expect(store.getState().txHistory.txs.byAccountId[ethAccountSpecifier]).toStrictEqual([
        serializeTxIndex(ethAccountSpecifier, EthSend.txid, EthSend.address),
        serializeTxIndex(ethAccountSpecifier, EthReceive.txid, EthReceive.address),
      ])

      expect(
        store.getState().txHistory.txs.byAccountId[segwitNativeAccountSpecifier],
      ).toStrictEqual([
        serializeTxIndex(segwitNativeAccountSpecifier, BtcSend.txid, BtcSend.address),
      ])

      expect(store.getState().txHistory.txs.byAccountId[segwitAccountSpecifier]).toStrictEqual([
        serializeTxIndex(segwitAccountSpecifier, BtcSendSegwit.txid, BtcSendSegwit.address),
      ])
    })
  })

  describe('selectLastNTxIds', () => {
    it('should memoize', () => {
      const txs: TxsState = {
        byId: {},
        byAssetId: {},
        byAccountId: {},
        ids: ['a', 'b'],
        status: 'loading',
      }
      const rebases: RebasesState = {
        byAssetId: {},
        byAccountId: {},
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
