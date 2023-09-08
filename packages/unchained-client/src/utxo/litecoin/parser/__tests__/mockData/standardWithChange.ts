import type { Tx } from '../../../../../generated/litecoin'

const tx: Tx = {
  txid: '2ff1b60d6c59f86d143a3fbf8fd73b45ef19d6fada27a6d94b925a06f03d0006',
  blockHash: '8a04b946cee33f094d196ac9b77b06002efa62025f458d06e2ea22757319d1ab',
  blockHeight: 2305171,
  timestamp: 1658947348,
  confirmations: 1,
  value: '147580075',
  fee: '100000',
  hex: '020000000125c41131a88fc28fc9a77971e1aa414395c52e3be786b8eea8fc7b117f1d468b020000006a47304402204a27099396fbc3a71c76cea527a5d34361fa3e7bbdfb24997bc7881a43c51b8102206a3fb4e6cba7326ba69eb57055064b8565b42c3dc1f764088fb64fd4e1ef8a7c0121039762aeac7f2dfa57183ab23600f5107f0cc2007a223bbea994de8e876041974fffffffff0263c3eb06000000001976a91485775fe7ff34a6e1111102152a5b947570814fa288ac4821e001000000001976a9148054d8d8dd6bce91125bcfe8bbb473f54afcdc6088ac00000000',
  vin: [
    {
      txid: '8b461d7f117bfca8eeb886e73b2ec5954341aae17179a7c98fc28fa83111c425',
      vout: '2',
      sequence: 4294967295,
      scriptSig: {
        hex: '47304402204a27099396fbc3a71c76cea527a5d34361fa3e7bbdfb24997bc7881a43c51b8102206a3fb4e6cba7326ba69eb57055064b8565b42c3dc1f764088fb64fd4e1ef8a7c0121039762aeac7f2dfa57183ab23600f5107f0cc2007a223bbea994de8e876041974f',
      },
      addresses: ['LWvWQ3XMoipFsAqE1EZPQFUovLea7DC1ef'],
      value: '147680075',
    },
  ],
  vout: [
    {
      value: '116114275',
      n: 0,
      scriptPubKey: {
        hex: '76a91485775fe7ff34a6e1111102152a5b947570814fa288ac',
      },
      addresses: ['LXPf92CJycUi5JogY3NXEgYqZygTkEXrsy'],
    },
    {
      value: '31465800',
      n: 1,
      scriptPubKey: {
        hex: '76a9148054d8d8dd6bce91125bcfe8bbb473f54afcdc6088ac',
      },
      addresses: ['LWvWQ3XMoipFsAqE1EZPQFUovLea7DC1ef'],
    },
  ],
}

export default {
  tx,
  txMempool: { ...tx, blockHash: undefined, blockHeight: -1, confirmations: 0 } as Tx,
}
