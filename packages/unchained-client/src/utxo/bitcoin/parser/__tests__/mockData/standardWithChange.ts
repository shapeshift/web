import type { Tx } from '../../../../../generated/bitcoin'

const tx: Tx = {
  txid: 'db75d53c585d4cc67b675a71981dba93155a0829422ea26033dc9f879c6da961',
  blockHash: '000000000000000000052c1da9a304a71ce34bd95cfff9a75bcb20c733d5352f',
  blockHeight: 712288,
  timestamp: 1638480779,
  confirmations: 24924,
  value: '4092777',
  fee: '6112',
  hex: '0200000001ab5729255188e50575cdb47ef2a0b9b8586d4cfcbce07d790bb9e18f401f381f010000006a47304402202c2163c8f6e7d0f63da7c8bd3c7faa320efef82a8b14d9633e6a4053525a0abf02202aab7f8d7815a6065c9b0dcef2fe0b5d1aa3e238ccee7be7153f2b060c887dcd0121032d10ee4bd6d1577e28ccddfad96cbf1eee64ccaf05eb54949fadfcfb8f252bcafdffffff0218d10200000000001976a9149905724deda6ad6b005cb67de0770ed82f76acc488ac51a23b00000000001976a91459b3eb23353e6b50b183bc9e506115484a2f37d988ac00000000',
  vin: [
    {
      txid: '1f381f408fe1b90b797de0bcfc4c6d58b8b9a0f27eb4cd7505e58851252957ab',
      vout: '1',
      sequence: 4294967293,
      scriptSig: {
        hex: '47304402202c2163c8f6e7d0f63da7c8bd3c7faa320efef82a8b14d9633e6a4053525a0abf02202aab7f8d7815a6065c9b0dcef2fe0b5d1aa3e238ccee7be7153f2b060c887dcd0121032d10ee4bd6d1577e28ccddfad96cbf1eee64ccaf05eb54949fadfcfb8f252bca',
      },
      addresses: ['19BJg2jSvz8pHiz7kKSgdp69iVV5CnAvzB'],
      value: '4098889',
    },
  ],
  vout: [
    {
      value: '184600',
      n: 0,
      scriptPubKey: {
        hex: '76a9149905724deda6ad6b005cb67de0770ed82f76acc488ac',
      },
      addresses: ['1Ex6unDe3gt4twj8GDHTutUbKvvHzMPj3e'],
    },
    {
      value: '3908177',
      n: 1,
      scriptPubKey: {
        hex: '76a91459b3eb23353e6b50b183bc9e506115484a2f37d988ac',
      },
      addresses: ['19BJg2jSvz8pHiz7kKSgdp69iVV5CnAvzB'],
    },
  ],
}

export default {
  tx,
  txMempool: { ...tx, blockHash: undefined, blockHeight: -1, confirmations: 0 } as Tx,
}
