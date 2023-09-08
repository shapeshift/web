import { mempoolMock } from './mempoolMock'

const ethOnly = {
  txid: '0x5557426ee8e2f3da4703a4b5ab265e5d3a5626da1f69b4d048c7230a75fa5936',
  blockHash: '0x39fbd8a96a5b519ea5301ecde6dbf2c63c4a767a3368586ca4c5165ef0999af3',
  blockHeight: 12659161,
  timestamp: 1624029849,
  status: 1,
  from: '0x8C8D7C46219D9205f056f28fee5950aD564d7465',
  to: '0x05EFB6161fe280dC17E5f9EaB6200b889E2D0A88',
  confirmations: 2154048,
  value: '46224000000000000',
  fee: '1050000000000000',
  gasLimit: '21000',
  gasUsed: '21000',
  gasPrice: '50000000000',
  inputData: '0x',
}

export default {
  tx: ethOnly,
  txMempool: mempoolMock(ethOnly),
}
