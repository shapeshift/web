import { UtxoAccountType } from '@shapeshiftoss/types'
import entries from 'lodash/entries'
import map from 'lodash/map'
import orderBy from 'lodash/orderBy'
import shuffle from 'lodash/shuffle'
// import { mockStore } from 'jest/mocks/store'
import { BtcSend, EthReceive, EthSend, testTxs } from 'jest/mocks/txs'
import { store } from 'state/store'

import { makeTxId, Tx, txHistory } from './txHistorySlice'

describe('txHistorySlice', () => {
  it('returns empty object for initialState', async () => {
    expect(store.getState().txHistory).toEqual({ byId: {}, ids: [] })
  })

  describe('onMessage', () => {
    it('can sort txs going into store', async () => {
      store.dispatch(txHistory.actions.clear())
      const shuffledTxs = shuffle(testTxs)
      shuffledTxs.forEach(tx => store.dispatch(txHistory.actions.onMessage({ message: tx })))
      const history = store.getState().txHistory
      const ids = history.ids
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

      const ethSendTxid = makeTxId(EthSend)
      const ethReceiveTxid = makeTxId(EthReceive)

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

      const btcSendTxId = makeTxId(BtcSend)
      const btcSendSegwitTxId = makeTxId(BtcSendSegwit)
      // btc data exists
      expect(store.getState().txHistory.byId[btcSendTxId]).toEqual(BtcSend)
      expect(store.getState().txHistory.byId[btcSendSegwitTxId]).toEqual(BtcSendSegwit)
    })

    //   it('should update existing transactions', async () => {
    //     store.dispatch(
    //       txHistory.actions.onMessage({
    //         message: { ...EthReceive, status: chainAdapters.TxStatus.Pending }
    //       })
    //     )
    //     expect(
    //       store.getState().txHistory[ChainTypes.Ethereum][
    //         `${EthReceive.txid}${EthReceive.asset}receive`
    //       ].status
    //     ).toBe(chainAdapters.TxStatus.Pending)

    //     store.dispatch(txHistory.actions.onMessage({ message: EthReceive }))
    //     expect(
    //       store.getState().txHistory[ChainTypes.Ethereum][
    //         `${EthReceive.txid}${EthReceive.asset}receive`
    //       ].status
    //     ).toBe(chainAdapters.TxStatus.Confirmed)
    //   })
    // })

    // describe('selectTxHistory', () => {
    //   it('should return all txs', () => {
    //     const store = {
    //       ...mockStore,
    //       txHistory: {
    //         [ChainTypes.Ethereum]: {
    //           [EthSend.txid]: EthSend
    //         },
    //         [ChainTypes.Bitcoin]: {
    //           [BtcSend.txid]: BtcSend
    //         }
    //       }
    //     }

    //     const result = selectTxHistory(store, {})

    //     expect(result.length).toBe(2)
    //   })

    //   it('should return txs by chain', () => {
    //     const store = {
    //       ...mockStore,
    //       txHistory: {
    //         [ChainTypes.Ethereum]: {
    //           [EthSend.txid]: EthSend
    //         },
    //         [ChainTypes.Bitcoin]: {
    //           [BtcSend.txid]: BtcSend
    //         }
    //       }
    //     }

    //     const result = selectTxHistory(store, { chain: ChainTypes.Ethereum })

    //     expect(result.length).toBe(1)
    //   })

    //   it('should filter txs', () => {
    //     const store = {
    //       ...mockStore,
    //       txHistory: {
    //         [ChainTypes.Ethereum]: {
    //           [EthSend.txid]: EthSend,
    //           [EthReceive.txid]: EthReceive,
    //           [`${EthReceive.txid}z`]: { ...EthReceive, txid: `${EthReceive.txid}z`, asset: '123' }
    //         },
    //         [ChainTypes.Bitcoin]: {
    //           [BtcSend.txid]: { ...BtcSend, accountType: 'segwit' },
    //           [`${BtcSend.txid}x`]: { ...BtcSend, accountType: 'segwit-native' },
    //           [`${BtcSend.txid}y`]: { ...BtcSend, accountType: 'segwit-native' }
    //         }
    //       }
    //     }

    //     let result = selectTxHistory(store, {
    //       chain: ChainTypes.Ethereum,
    //       filter: {
    //         identifier: ChainTypes.Ethereum
    //       }
    //     })
    //     expect(result.length).toBe(2)

    //     result = selectTxHistory(store, {
    //       chain: ChainTypes.Ethereum,
    //       filter: {
    //         identifier: '123'
    //       }
    //     })
    //     expect(result.length).toBe(1)

    //     result = selectTxHistory(store, {
    //       chain: ChainTypes.Ethereum,
    //       filter: {
    //         identifier: ChainTypes.Ethereum,
    //         txid: `${EthReceive.txid}z`
    //       }
    //     })
    //     expect(result.length).toBe(0)

    //     result = selectTxHistory(store, {
    //       chain: ChainTypes.Ethereum,
    //       filter: {
    //         identifier: '123',
    //         txid: `${EthReceive.txid}z`
    //       }
    //     })
    //     expect(result.length).toBe(1)

    //     result = selectTxHistory(store, {
    //       chain: ChainTypes.Bitcoin,
    //       filter: {
    //         accountType: 'segwit'
    //       }
    //     })
    //     expect(result.length).toBe(1)

    //     result = selectTxHistory(store, {
    //       chain: ChainTypes.Bitcoin,
    //       filter: {
    //         accountType: 'segwit-native'
    //       }
    //     })
    //     expect(result.length).toBe(2)
    //   })

    //   it('should sort txs', () => {
    //     const store = {
    //       ...mockStore,
    //       txHistory: {
    //         [ChainTypes.Ethereum]: {
    //           [EthSend.txid]: { ...EthSend, blockTime: 1 },
    //           [EthReceive.txid]: { ...EthReceive, blockTime: 2 },
    //           [`${EthReceive.txid}z`]: {
    //             ...EthReceive,
    //             txid: `${EthReceive.txid}z`,
    //             blockTime: 2,
    //             status: chainAdapters.TxStatus.Pending
    //           }
    //         },
    //         [ChainTypes.Bitcoin]: {}
    //       }
    //     }

    //     let result = selectTxHistory(store, {
    //       chain: ChainTypes.Ethereum
    //     })
    //     expect(result[0].txid).toBe(`${EthReceive.txid}z`)
    //     expect(result[1].txid).toBe(EthReceive.txid)
    //     expect(result[2].txid).toBe(EthSend.txid)
    //   })
  })
})
