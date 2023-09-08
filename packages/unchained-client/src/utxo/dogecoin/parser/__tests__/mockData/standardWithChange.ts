import type { Tx } from '../../../../../generated/dogecoin'

const tx: Tx = {
  txid: '4bf68bcbd77c5c0ee0db13abe84e2c6fb12f23b982a17bc2ac77798e8fe7caf1',
  blockHash: '6d2a834a0c4c1801749f5386efb3db6b68f50016cd446e50a20a0a16ce401f03',
  blockHeight: 4324277,
  timestamp: 1658948277,
  confirmations: 5,
  value: '70369895136118',
  fee: '125900000',
  hex: '01000000019d4f3cc862cad0c474f683c432724385242f2be41ecf0958eef0bce31224e564010000006a47304402204a6d7a74bf46f57715f73671ae83930ca9138f06964acb30c3ac071d08dd3abb022063245d6e6a50c61c2387661355a523af2554dc3f69b10c322ca1eb4e223ef28c012103f0c96a02bac5cd15993028787086a07d548f14b9a06567c274e2bee975bd515dffffffff0254f35e0a220000001976a91489763a35f84511f65ceed4e04dcd7aa52115ff4f88ac22483b3ade3f00001976a9145b7b101880120532e5bcf3a4b8b98bca4ffcb7ee88ac00000000',
  vin: [
    {
      txid: '64e52412e3bcf0ee5809cf1ee42b2f2485437232c483f674c4d0ca62c83c4f9d',
      vout: '1',
      sequence: 4294967295,
      scriptSig: {
        hex: '47304402204a6d7a74bf46f57715f73671ae83930ca9138f06964acb30c3ac071d08dd3abb022063245d6e6a50c61c2387661355a523af2554dc3f69b10c322ca1eb4e223ef28c012103f0c96a02bac5cd15993028787086a07d548f14b9a06567c274e2bee975bd515d',
      },
      addresses: ['DDUoTGov76gcqAEBXXpUHzSuSQkPYKze9N'],
      value: '70370021036118',
    },
  ],
  vout: [
    {
      value: '146202882900',
      n: 0,
      scriptPubKey: {
        hex: '76a91489763a35f84511f65ceed4e04dcd7aa52115ff4f88ac',
      },
      addresses: ['DHfvk82f2sCqsoUXzTyQSDUoF5YZVYoE1Y'],
    },
    {
      value: '70223692253218',
      n: 1,
      scriptPubKey: {
        hex: '76a9145b7b101880120532e5bcf3a4b8b98bca4ffcb7ee88ac',
      },
      addresses: ['DDUoTGov76gcqAEBXXpUHzSuSQkPYKze9N'],
    },
  ],
}

export default {
  tx,
  txMempool: { ...tx, blockHash: undefined, blockHeight: -1, confirmations: 0 } as Tx,
}
