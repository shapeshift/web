import type { Tx } from '../../../index'
import { mempoolMock } from './mempoolMock'

export const tokenStandard: Tx = {
  txid: '0xa7642a3da15a5e8b9198f2be6c1ff8b2ad027496cee167e051440476affc731a',
  blockHash: '0x34f5dad8cc88c6e2180e836fca5c1d227664b20a5a22e5662fc86b70f0dc3e57',
  blockHeight: 14553049,
  timestamp: 1715895445,
  status: 1,
  from: '0x8a474fdab0f58d3FA92A9D2E56125262B2f9d6Ed',
  to: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  confirmations: 9,
  value: '0',
  fee: '7413089345108',
  gasLimit: '72398',
  gasUsed: '57371',
  gasPrice: '129027025',
  inputData:
    '0xa9059cbb000000000000000000000000cb131840f8843984ed6c5c0e3280ec8514f0f8270000000000000000000000000000000000000000000000000000000002ce8864',
  tokenTransfers: [
    {
      contract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      decimals: 6,
      name: 'USD Coin',
      symbol: 'USDC',
      type: 'ERC20',
      from: '0x8a474fdab0f58d3FA92A9D2E56125262B2f9d6Ed',
      to: '0xcb131840f8843984ED6C5c0E3280ec8514F0f827',
      value: '47089764',
    },
  ],
  internalTxs: [],
}

export default {
  tx: tokenStandard,
  txMempool: mempoolMock(tokenStandard),
}
