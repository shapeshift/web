import { mempoolMock } from './mempoolMock'

const ethOnly = {
  txid: '0x5557426ee8e2f3da4703a4b5ab265e5d3a5626da1f69b4d048c7230a75fa5936',
  vin: [
    {
      n: 0,
      addresses: ['0x8C8D7C46219D9205f056f28fee5950aD564d7465'],
      isAddress: true
    }
  ],
  vout: [
    {
      value: '46224000000000000',
      n: 0,
      addresses: ['0x05EFB6161fe280dC17E5f9EaB6200b889E2D0A88'],
      isAddress: true
    }
  ],
  blockHash: '0x39fbd8a96a5b519ea5301ecde6dbf2c63c4a767a3368586ca4c5165ef0999af3',
  blockHeight: 12659161,
  confirmations: 14,
  blockTime: 1624029849,
  value: '46224000000000000',
  fees: '1050000000000000',
  ethereumSpecific: {
    status: 1,
    nonce: 4605,
    gasLimit: 21000,
    gasUsed: 21000,
    gasPrice: '50000000000',
    data: '0x'
  }
}

export default {
  tx: ethOnly,
  txMempool: mempoolMock(ethOnly)
}
