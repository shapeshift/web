import { mempoolMock } from './mempoolMock'

const tokenSelfSend = {
  txid: '0xa9e0f831d57140cde9f40d8a1fac2342642f982190428618dc6b0c1c334069da',
  vin: [
    {
      n: 0,
      addresses: ['0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C'],
      isAddress: true
    }
  ],
  vout: [
    {
      value: '0',
      n: 0,
      addresses: ['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'],
      isAddress: true
    }
  ],
  blockHash: '0xb8e998d8bd8f51dae6ce417958b3d5d2d1dd936477d6aed9836b68d137a1ccb5',
  blockHeight: 12697967,
  confirmations: 90639,
  blockTime: 1624553243,
  value: '0',
  fees: '1011738000000000',
  tokenTransfers: [
    {
      type: 'ERC20',
      from: '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C',
      to: '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C',
      token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
      value: '1502080'
    }
  ],
  ethereumSpecific: {
    status: 1,
    nonce: 51,
    gasLimit: 46382,
    gasUsed: 38913,
    gasPrice: '26000000000',
    data: '0xa9059cbb0000000000000000000000006bf198c2b5c8e48af4e876bc2173175b89b1da0c000000000000000000000000000000000000000000000000000000000016eb80'
  }
}

export default {
  tx: tokenSelfSend,
  txMempool: mempoolMock(tokenSelfSend, true)
}
