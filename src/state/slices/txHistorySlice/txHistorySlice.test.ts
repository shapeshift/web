import { chainAdapters, ChainTypes } from '@shapeshiftoss/types'
import { mockStore } from 'jest/mocks/store'
import { BtcSend, EthReceive, EthSend } from 'jest/mocks/txs'
import { store } from 'state/store'

import { selectTxHistory, txHistory } from './txHistorySlice'

describe('txHistorySlice', () => {
  it('returns empty object for initialState', async () => {
    expect(store.getState().txHistory).toEqual({})
  })

  describe('onMessage', () => {
    it('should have correct starting state', async () => {
      expect(store.getState().txHistory[ChainTypes.Ethereum]).toBeFalsy()
      expect(store.getState().txHistory[ChainTypes.Bitcoin]).toBeFalsy()
    })

    it('should add new transactions', async () => {
      store.dispatch(txHistory.actions.onMessage({ message: EthSend }))
      expect(Object.values(store.getState().txHistory[ChainTypes.Ethereum]).length).toBe(1)

      store.dispatch(txHistory.actions.onMessage({ message: EthReceive }))
      expect(Object.values(store.getState().txHistory[ChainTypes.Ethereum]).length).toBe(2)

      expect(store.getState().txHistory[ChainTypes.Ethereum]).toBeTruthy()

      store.dispatch(txHistory.actions.onMessage({ message: BtcSend }))
      expect(Object.values(store.getState().txHistory[ChainTypes.Bitcoin]).length).toBe(1)

      expect(store.getState().txHistory[ChainTypes.Bitcoin]).toBeTruthy()
    })

    it('should update existing transactions', async () => {
      store.dispatch(
        txHistory.actions.onMessage({
          message: { ...EthReceive, status: chainAdapters.TxStatus.Pending }
        })
      )
      expect(store.getState().txHistory[ChainTypes.Ethereum][EthReceive.txid].status).toBe(
        chainAdapters.TxStatus.Pending
      )

      store.dispatch(txHistory.actions.onMessage({ message: EthReceive }))
      expect(store.getState().txHistory[ChainTypes.Ethereum][EthReceive.txid].status).toBe(
        chainAdapters.TxStatus.Confirmed
      )
    })
  })

  describe('selectTxHistory', () => {
    it('should return all txs', () => {
      const store = {
        ...mockStore,
        txHistory: {
          [ChainTypes.Ethereum]: {
            [EthSend.txid]: EthSend
          },
          [ChainTypes.Bitcoin]: {
            [BtcSend.txid]: BtcSend
          }
        }
      }

      const result = selectTxHistory(store, {})

      expect(result.length).toBe(2)
    })

    it('should return txs by chain', () => {
      const store = {
        ...mockStore,
        txHistory: {
          [ChainTypes.Ethereum]: {
            [EthSend.txid]: EthSend
          },
          [ChainTypes.Bitcoin]: {
            [BtcSend.txid]: BtcSend
          }
        }
      }

      const result = selectTxHistory(store, { chain: ChainTypes.Ethereum })

      expect(result.length).toBe(1)
    })

    it('should filter txs', () => {
      const store = {
        ...mockStore,
        txHistory: {
          [ChainTypes.Ethereum]: {
            [EthSend.txid]: EthSend,
            [EthReceive.txid]: EthReceive,
            [`${EthReceive.txid}z`]: { ...EthReceive, txid: `${EthReceive.txid}z`, asset: '123' }
          },
          [ChainTypes.Bitcoin]: {
            [BtcSend.txid]: { ...BtcSend, accountType: 'segwit' },
            [`${BtcSend.txid}x`]: { ...BtcSend, accountType: 'segwit-native' },
            [`${BtcSend.txid}y`]: { ...BtcSend, accountType: 'segwit-native' }
          }
        }
      }

      let result = selectTxHistory(store, {
        chain: ChainTypes.Ethereum,
        filter: {
          identifier: ChainTypes.Ethereum
        }
      })
      expect(result.length).toBe(2)

      result = selectTxHistory(store, {
        chain: ChainTypes.Ethereum,
        filter: {
          identifier: '123'
        }
      })
      expect(result.length).toBe(1)

      result = selectTxHistory(store, {
        chain: ChainTypes.Ethereum,
        filter: {
          identifier: ChainTypes.Ethereum,
          txid: `${EthReceive.txid}z`
        }
      })
      expect(result.length).toBe(0)

      result = selectTxHistory(store, {
        chain: ChainTypes.Ethereum,
        filter: {
          identifier: '123',
          txid: `${EthReceive.txid}z`
        }
      })
      expect(result.length).toBe(1)

      result = selectTxHistory(store, {
        chain: ChainTypes.Bitcoin,
        filter: {
          accountType: 'segwit'
        }
      })
      expect(result.length).toBe(1)

      result = selectTxHistory(store, {
        chain: ChainTypes.Bitcoin,
        filter: {
          accountType: 'segwit-native'
        }
      })
      expect(result.length).toBe(2)
    })

    it('should sort txs', () => {
      const store = {
        ...mockStore,
        txHistory: {
          [ChainTypes.Ethereum]: {
            [EthSend.txid]: { ...EthSend, blockTime: 1 },
            [EthReceive.txid]: { ...EthReceive, blockTime: 2 },
            [`${EthReceive.txid}z`]: {
              ...EthReceive,
              txid: `${EthReceive.txid}z`,
              blockTime: 2,
              status: chainAdapters.TxStatus.Pending
            }
          },
          [ChainTypes.Bitcoin]: {}
        }
      }

      let result = selectTxHistory(store, {
        chain: ChainTypes.Ethereum
      })
      expect(result[0].txid).toBe(`${EthReceive.txid}z`)
      expect(result[1].txid).toBe(EthReceive.txid)
      expect(result[2].txid).toBe(EthSend.txid)
    })
  })
})
