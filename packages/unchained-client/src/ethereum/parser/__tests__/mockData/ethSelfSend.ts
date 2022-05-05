import { mempoolMock } from './mempoolMock'

const ethSelfSend = {
  txid: '0x854dff9231cadb562129cff006150dfc6dd1508ea2a39c9b51292d234c47a992',
  vin: [
    {
      n: 0,
      addresses: ['0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C'],
      isAddress: true
    }
  ],
  vout: [
    {
      value: '503100000000000',
      n: 0,
      addresses: ['0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C'],
      isAddress: true
    }
  ],
  blockHash: '0xeafabfeaa242a02c116e4a67a45ef5b34b24b6743922b7d4efdad1a3e8454b24',
  blockHeight: 12697941,
  confirmations: 90665,
  blockTime: 1624552745,
  value: '503100000000000',
  fees: '399000000000000',
  ethereumSpecific: {
    status: 1,
    nonce: 49,
    gasLimit: 23100,
    gasUsed: 21000,
    gasPrice: '19000000000',
    data: '0x'
  }
}

export default {
  tx: ethSelfSend,
  txMempool: mempoolMock(ethSelfSend)
}
