import { mempoolMock } from './mempoolMock'

const tokenSelfSend = {
  txid: '0xa9e0f831d57140cde9f40d8a1fac2342642f982190428618dc6b0c1c334069da',
  blockHash: '0xb8e998d8bd8f51dae6ce417958b3d5d2d1dd936477d6aed9836b68d137a1ccb5',
  blockHeight: 12697967,
  timestamp: 1624553243,
  status: 1,
  from: '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C',
  to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  confirmations: 2115299,
  value: '0',
  fee: '1011738000000000',
  gasLimit: '46382',
  gasUsed: '38913',
  gasPrice: '26000000000',
  inputData:
    '0xa9059cbb0000000000000000000000006bf198c2b5c8e48af4e876bc2173175b89b1da0c000000000000000000000000000000000000000000000000000000000016eb80',
  tokenTransfers: [
    {
      contract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      decimals: 6,
      name: 'USD Coin',
      symbol: 'USDC',
      type: 'ERC20',
      from: '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C',
      to: '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C',
      value: '1502080',
    },
  ],
}

export default {
  tx: tokenSelfSend,
  txMempool: mempoolMock(tokenSelfSend, true),
}
