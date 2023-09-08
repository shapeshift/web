import type { Tx } from '../../../../../generated/ethereum'

export const mempoolMock = (tx: Tx, tokenTransfers = false) => {
  const mempoolSpecific = {
    blockHeight: -1,
    status: -1,
    gasUsed: undefined,
    confirmations: 0,
    fee: '0',
    blockHash: undefined,
    tokenTransfers: tokenTransfers ? tx.tokenTransfers : [],
    internalTxs: undefined,
  }
  return Object.assign({}, tx, mempoolSpecific)
}
