import type { Tx } from '../../../../../generated/dogecoin'

const tx: Tx = {
  txid: '94931a7b0c577002462327aed63207912ee13eb11c25d29f6474a108c72a803c',
  blockHash: '6d2a834a0c4c1801749f5386efb3db6b68f50016cd446e50a20a0a16ce401f03',
  blockHeight: 4324277,
  timestamp: 1658948277,
  confirmations: 1,
  value: '737949312',
  fee: '12050688',
  hex: '0100000001714874d658f2cb610d0c2a7417165fce70cb4f7b965c901ae9265f167d6bc0a9c10100006b483045022100b6822933fde76ef9892b24486b4675cd32c8e8d6af3177c4b469ab8ba1f083ee02206c11f669572c08c4e5a9dfd4667c63310df421bc06c6488130c7db6d08accf1901210277033f3e04921c976f7523e0df0577169333de2bbba47368cc6f73bd775de6e4feffffff018036fc2b000000001976a914d5141a1af64a9bfdd764dbfb3174da8b67726bdd88ac00000000',
  vin: [
    {
      txid: 'a9c06b7d165f26e91a905c967b4fcb70ce5f1617742a0c0d61cbf258d6744871',
      vout: '449',
      sequence: 4294967294,
      scriptSig: {
        hex: '483045022100b6822933fde76ef9892b24486b4675cd32c8e8d6af3177c4b469ab8ba1f083ee02206c11f669572c08c4e5a9dfd4667c63310df421bc06c6488130c7db6d08accf1901210277033f3e04921c976f7523e0df0577169333de2bbba47368cc6f73bd775de6e4',
      },
      addresses: ['D7N7452tBhydYh9ecEfFpQgw8yXXapxRCP'],
      value: '750000000',
    },
  ],
  vout: [
    {
      value: '737949312',
      n: 0,
      scriptPubKey: {
        hex: '76a914d5141a1af64a9bfdd764dbfb3174da8b67726bdd88ac',
      },
      addresses: ['DQZkYpyV2YzkyqnZDqekbKuSD6VGq6CqHb'],
    },
  ],
}

export default {
  tx,
  txMempool: { ...tx, blockHash: undefined, blockHeight: -1, confirmations: 0 } as Tx,
}
