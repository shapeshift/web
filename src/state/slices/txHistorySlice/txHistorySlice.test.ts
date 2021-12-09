import { caip2, caip19 } from '@shapeshiftoss/caip'
import { chainAdapters, ChainTypes, NetworkTypes, UtxoAccountType } from '@shapeshiftoss/types'
import entries from 'lodash/entries'
import map from 'lodash/map'
import orderBy from 'lodash/orderBy'
import shuffle from 'lodash/shuffle'
import { mockStore } from 'jest/mocks/store'
import { BtcSend, EthReceive, EthSend, testTxs } from 'jest/mocks/txs'
import { store } from 'state/store'

import { selectLastNTxIds, selectTxHistoryByFilter, Tx, txHistory, txToId } from './txHistorySlice'

describe('txHistorySlice', () => {
  it('returns empty object for initialState', async () => {
    expect(store.getState().txHistory).toEqual({ byId: {}, ids: [] })
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

      const ethSendTxid = txToId(EthSend)
      const ethReceiveTxid = txToId(EthReceive)

      // new eth transaction (receive)
      store.dispatch(txHistory.actions.onMessage({ message: EthReceive }))
      expect(Object.values(store.getState().txHistory.ids).length).toBe(2)

      // eth data exists
      expect(store.getState().txHistory.byId[ethSendTxid]).toEqual(EthSend)
      expect(store.getState().txHistory.byId[ethReceiveTxid]).toEqual(EthReceive)

      // new btc transaction (send)
      store.dispatch(txHistory.actions.onMessage({ message: BtcSend }))
      expect(Object.values(store.getState().txHistory.ids).length).toBe(3)

      // duplicate btc transaction (send)
      store.dispatch(txHistory.actions.onMessage({ message: BtcSend }))
      expect(Object.values(store.getState().txHistory.ids).length).toBe(3)

      // same btc transaction, different account type (send)
      const BtcSendSegwit = { ...BtcSend, accountType: UtxoAccountType.SegwitNative }
      store.dispatch(txHistory.actions.onMessage({ message: BtcSendSegwit }))
      expect(Object.values(store.getState().txHistory.ids).length).toBe(4)

      const btcSendTxId = txToId(BtcSend)
      const btcSendSegwitTxId = txToId(BtcSendSegwit)
      // btc data exists
      expect(store.getState().txHistory.byId[btcSendTxId]).toEqual(BtcSend)
      expect(store.getState().txHistory.byId[btcSendSegwitTxId]).toEqual(BtcSendSegwit)
    })

    it('should update existing transactions', async () => {
      const EthReceivePending = { ...EthReceive, status: chainAdapters.TxStatus.Pending }
      store.dispatch(txHistory.actions.onMessage({ message: EthReceivePending }))
      const ethReceivePendingId = txToId(EthReceivePending)

      expect(store.getState().txHistory.byId[ethReceivePendingId].status).toBe(
        chainAdapters.TxStatus.Pending
      )

      const ethReceiveConfirmedId = txToId(EthReceive)
      store.dispatch(txHistory.actions.onMessage({ message: EthReceive }))
      expect(store.getState().txHistory.byId[ethReceiveConfirmedId].status).toBe(
        chainAdapters.TxStatus.Confirmed
      )
    })
  })
})

describe('selectTxHistory', () => {
  const ethSendId = txToId(EthSend)
  const btcSendId = txToId(BtcSend)

  const ethChain = ChainTypes.Ethereum
  const network = NetworkTypes.MAINNET
  const ethCAIP2 = caip2.toCAIP2({ chain: ethChain, network })
  const ethCAIP19 = caip19.toCAIP19({ chain: ethChain, network })

  const btcCAIP2 = caip2.toCAIP2({ chain: ChainTypes.Bitcoin, network })

  it('should return all txs', () => {
    const store = {
      ...mockStore,
      txHistory: {
        byId: {
          [ethSendId]: EthSend,
          [btcSendId]: BtcSend
        },
        ids: [ethSendId, btcSendId]
      }
    }

    const result = selectTxHistoryByFilter(store, {})

    expect(result.length).toBe(2)
  })

  it('should return txs by chain', () => {
    const store = {
      ...mockStore,
      txHistory: {
        byId: {
          [ethSendId]: EthSend,
          [btcSendId]: BtcSend
        },
        ids: [ethSendId, btcSendId]
      }
    }

    const result = selectTxHistoryByFilter(store, { caip2: ethCAIP2 })

    expect(result.length).toBe(1)
  })

  it('should filter txs', () => {
    const ethSendId = txToId(EthSend)
    const ethReceiveId = txToId(EthReceive)

    const FOXCAIP19 = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
    const EthReceiveFOX = {
      ...EthReceive,
      txid: `${EthReceive.txid}z`,
      transfers: [
        {
          caip19: FOXCAIP19,
          from: EthReceive.transfers[0].from,
          to: EthReceive.transfers[0].to,
          value: EthReceive.transfers[0].value,
          type: EthReceive.transfers[0].type
        }
      ]
    }
    const ethReceiveFOXId = txToId(EthReceiveFOX)

    const BtcSendSegwitP2sh = { ...BtcSend, accountType: UtxoAccountType.SegwitP2sh }
    const btcSendSegwitP2shId = txToId(BtcSendSegwitP2sh)

    const BtcSendSegwitNative = { ...BtcSend, accountType: UtxoAccountType.SegwitNative }
    const btcSendSegwitNativeId = txToId(BtcSendSegwitNative)

    const store = {
      ...mockStore,
      txHistory: {
        byId: {
          [ethSendId]: EthSend,
          [ethReceiveId]: EthReceive,
          [ethReceiveFOXId]: EthReceiveFOX,
          [btcSendSegwitP2shId]: BtcSendSegwitP2sh,
          [btcSendSegwitNativeId]: BtcSendSegwitNative
        },
        ids: [ethSendId, ethReceiveId, ethReceiveFOXId, btcSendSegwitP2shId, btcSendSegwitNativeId]
      }
    }

    let result = selectTxHistoryByFilter(store, { caip19: ethCAIP19 })
    expect(result.length).toBe(2)

    result = selectTxHistoryByFilter(store, { caip2: ethCAIP2, caip19: FOXCAIP19 })
    expect(result.length).toBe(1)

    result = selectTxHistoryByFilter(store, {
      caip2: ethCAIP2,
      caip19: ethCAIP19,
      txid: ethReceiveFOXId
    })
    expect(result.length).toBe(0)

    result = selectTxHistoryByFilter(store, { caip2: ethCAIP2, txid: EthReceiveFOX.txid })
    expect(result.length).toBe(1)

    result = selectTxHistoryByFilter(store, {
      caip2: btcCAIP2,
      accountType: UtxoAccountType.SegwitNative
    })
    expect(result.length).toBe(1)

    result = selectTxHistoryByFilter(store, {
      caip2: btcCAIP2,
      accountType: UtxoAccountType.SegwitP2sh
    })
    expect(result.length).toBe(1)
  })
})

describe('selectLastNTxIds', () => {
  it('should memoize', () => {
    const state = {
      ...mockStore,
      txHistory: {
        byId: {},
        ids: ['a', 'b']
      }
    }
    const first = selectLastNTxIds(state, 1)

    // redux will replace the array on update
    const newState = {
      ...mockStore,
      txHistory: {
        byId: {},
        // this array will always change on every new tx
        ids: ['a', 'b', 'c']
      }
    }
    const second = selectLastNTxIds(newState, 1)

    // toBe uses reference equality, not like isEqual deep equal check
    expect(first).toBe(second)
  })
})
