import { ChainTypes } from '@shapeshiftoss/types'
import { mockStore } from 'jest/mocks/store'
import { BtcSend, EthReceive, EthSend } from 'jest/mocks/txs'

import { selectRecentTxHistory } from './selectRecentTxHistory'

const firstTx = { ...EthSend, blockTime: 1634917507 }
const secondTx = { ...EthReceive, blockTime: 1634053165 }
const thirdTx = { ...BtcSend, blockTime: 1633633106 }
const fourthTx = { ...EthReceive, blockTime: 1633630546 }
const fifthTx = { ...BtcSend, blockTime: 1633625920 }

describe('selectRecentTxHistory', () => {
  it('returns all txHistory for multiple chains sorted by blockTime', () => {
    const store = {
      ...mockStore,
      txHistory: {
        [ChainTypes.Ethereum]: [fourthTx, secondTx, firstTx],
        [ChainTypes.Bitcoin]: [fifthTx, thirdTx]
      }
    }
    const txs = selectRecentTxHistory(store)
    expect(txs[0].blockTime).toBe(firstTx.blockTime)
    expect(txs[1].blockTime).toBe(secondTx.blockTime)
    expect(txs[2].blockTime).toBe(thirdTx.blockTime)
    expect(txs[3].blockTime).toBe(fourthTx.blockTime)
    expect(txs[4].blockTime).toBe(fifthTx.blockTime)
  })

  it('returns only the first 10', () => {
    const store = {
      ...mockStore,
      txHistory: {
        [ChainTypes.Ethereum]: [fourthTx, secondTx, firstTx, EthSend, EthSend, EthReceive],
        [ChainTypes.Bitcoin]: [fifthTx, thirdTx, BtcSend, BtcSend, BtcSend, BtcSend]
      }
    }
    const txs = selectRecentTxHistory(store)
    expect(txs.length).toBe(10)
  })
})
