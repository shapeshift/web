import { btcAssetId, ethAssetId } from '@shapeshiftoss/caip'
import { UtxoAccountType } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { map, reverse } from 'lodash'
import { BtcSend, ethereumTransactions, EthReceive, EthSend } from 'test/mocks/txs'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { store } from 'state/store'

import { txHistory } from './txHistorySlice'
import { serializeTxIndex } from './utils'

describe('txHistorySlice', () => {
  const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => void 0)
  beforeAll(() => {
    vi.resetModules()
  })
  afterAll(() => consoleInfoSpy.mockRestore())

  it('returns empty object for initialState', () => {
    expect(store.getState().txHistory).toEqual({
      _persist: {
        rehydrated: true,
        version: 0,
      },
      hydrationMeta: {},
      txs: {
        byId: {},
        byAccountIdAssetId: {},
        ids: [],
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
      const expected = map(transactions, tx => serializeTxIndex(accountId, tx.txid, tx.pubkey))

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
          serializeTxIndex(ethAccountId, EthSend.txid, EthSend.pubkey)
        ],
      ).toEqual(EthSend)
      expect(
        store.getState().txHistory.txs.byId[
          serializeTxIndex(ethAccountId, EthReceive.txid, EthReceive.pubkey)
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
          serializeTxIndex(segwitNativeAccountId, BtcSend.txid, BtcSend.pubkey)
        ],
      ).toEqual(BtcSend)
      expect(
        store.getState().txHistory.txs.byId[
          serializeTxIndex(segwitAccountId, BtcSendSegwit.txid, BtcSendSegwit.pubkey)
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
          serializeTxIndex(ethAccountId, EthReceivePending.txid, EthReceivePending.pubkey)
        ].status,
      ).toBe(TxStatus.Pending)

      store.dispatch(txHistory.actions.onMessage({ message: EthReceive, accountId: ethAccountId }))
      expect(
        store.getState().txHistory.txs.byId[
          serializeTxIndex(ethAccountId, EthReceive.txid, EthReceive.pubkey)
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
        serializeTxIndex(ethAccountId, EthSend.txid, EthSend.pubkey),
        serializeTxIndex(ethAccountId, EthReceive.txid, EthReceive.pubkey),
      ])

      expect(
        store.getState().txHistory.txs.byAccountIdAssetId[segwitNativeAccountId]?.[btcAssetId],
      ).toStrictEqual([serializeTxIndex(segwitNativeAccountId, BtcSend.txid, BtcSend.pubkey)])

      expect(
        store.getState().txHistory.txs.byAccountIdAssetId?.[segwitAccountId]?.[btcAssetId],
      ).toStrictEqual([serializeTxIndex(segwitAccountId, BtcSendSegwit.txid, BtcSendSegwit.pubkey)])
    })
  })
})
