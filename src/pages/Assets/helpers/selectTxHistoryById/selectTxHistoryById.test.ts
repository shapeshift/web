import { ChainTypes } from '@shapeshiftoss/types'
import { EthReceive, EthSend } from 'jest/mocks/txs'

import { selectTxHistoryById } from './selectTxHistoryById'

const tokenId = 'contractAddress'
const firstTx = { ...EthSend, asset: ChainTypes.Ethereum }
const secondTx = { ...EthReceive, asset: ChainTypes.Ethereum }
const thirdTx = { ...EthReceive, asset: tokenId }

describe('selectTxHistoryById', () => {
  it('returns by identifier', () => {
    const store = {
      txHistory: {
        [ChainTypes.Ethereum]: [thirdTx, secondTx, firstTx]
      },
      assets: {}
    }
    const txsEth = selectTxHistoryById(store, ChainTypes.Ethereum, ChainTypes.Ethereum)
    expect(txsEth.length).toBe(2)

    const txs = selectTxHistoryById(store, ChainTypes.Ethereum, tokenId)
    expect(txs.length).toBe(1)
  })
})
