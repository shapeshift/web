import { chainAdapters, ChainTypes } from '@shapeshiftoss/types'
import { Tx } from 'state/slices/txHistorySlice/txHistorySlice'

export const EthSend: Tx = {
  address: '0x9124248f2AD8c94fC4a403588BE7a77984B34bb8',
  blockHash: '0x5edb4bbd1c33026053bd886b898bf6424b36e4b8fe3f4c8e2b6abc83079ed89b',
  blockHeight: 13468273,
  blockTime: 1634917507,
  caip2: 'eip155:1',
  chain: ChainTypes.Ethereum,
  confirmations: 875,
  txid: '0xb8c6eef6bfa02a60b5e00f5c84994084065efeb3bee0259dfc133e28f760a58b',
  fee: { value: '2234067070809000', caip19: 'eip155:1/slip44:60' },
  status: chainAdapters.TxStatus.Confirmed,
  transfers: [
    {
      caip19: 'eip155:1/slip44:60',
      from: '0x9124248f2AD8c94fC4a403588BE7a77984B34bb8',
      to: '0x2d44C8B87D0Ec0D19A5249aDccf3BaCc43c5afe6',
      value: '250923588302732',
      type: chainAdapters.TxType.Send
    }
  ]
}

export const EthReceive: Tx = {
  address: '0x2d44C8B87D0Ec0D19A5249aDccf3BaCc43c5afe6',
  blockHash: '0x5edb4bbd1c33026053bd886b898bf6424b36e4b8fe3f4c8e2b6abc83079ed89b',
  blockHeight: 13468273,
  blockTime: 1634917507,
  caip2: 'eip155:1',
  chain: ChainTypes.Ethereum,
  confirmations: 875,
  txid: '0xc8c6eef6bfa02a60b5e00f5c84994084065efeb3bee0259dfc133e28f760a58b',
  fee: { value: '2234067070809000', caip19: 'eip155:1/slip44:60' },
  status: chainAdapters.TxStatus.Confirmed,
  transfers: [
    {
      caip19: 'eip155:1/slip44:60',
      from: '0x9124248f2AD8c94fC4a403588BE7a77984B34bb8',
      to: '0x2d44C8B87D0Ec0D19A5249aDccf3BaCc43c5afe6',
      value: '250923588302732',
      type: chainAdapters.TxType.Receive
    }
  ]
}

export const BtcSend: Tx = {
  address: 'bc1q2v8pww5t2qmgwteypn535hxa0uegrc7hvper7w',
  blockHash: 'e12cb64834058bb785b7b8932f079deafc3633f999f722779ee9de351273af65',
  blockHeight: 13468273,
  blockTime: 1634917507,
  caip2: 'bip122:000000000019d6689c085ae165831e93',
  chain: ChainTypes.Bitcoin,
  confirmations: 875,
  txid: 'e12cb64834058bb785b7b8932f079deafc3633f999f722779ee9de351273af65',
  fee: { value: '2234067070809000', caip19: 'bip122:000000000019d6689c085ae165831e93/slip44:0' },
  status: chainAdapters.TxStatus.Confirmed,
  transfers: [
    {
      caip19: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
      from: 'bc1q2v8pww5t2qmgwteypn535hxa0uegrc7hvper7w',
      to: 'bc1q2v8pww5t2qmgwteypn535hxa0uegrc7hvper7w',
      value: '250923588302732',
      type: chainAdapters.TxType.Send
    },
    {
      caip19: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
      from: 'bc1q2v8pww5t2qmgwteypn535hxa0uegrc7hvper7w',
      to: 'bc1q2v8pww5t2qmgwteypn535hxa0uegrc7hvper7w',
      value: '250923588302732',
      type: chainAdapters.TxType.Receive
    }
  ]
}

export const FOXSend: Tx = {
  address: '0x2d44C8B87D0Ec0D19A5249aDccf3BaCc43c5afe6',
  blockHash: '0x8e93bec969f88f472da18a88d68eaac9a4f4b6025a9e4699aedebfa8a08969c4',
  blockHeight: 13011202,
  // unchained uses seconds, Z gives UTC timezone
  blockTime: new Date('2021-10-31T23:30:01Z').valueOf() / 1000,
  confirmations: 629748,
  caip2: 'eip155:1',
  txid: '0x88d774530e7b7544f86ed25e4c602a15402ac79b9617d30624c4acd3c1034769',
  fee: {
    caip19: 'eip155:1/slip44:60',
    value: '1625777000000000'
  },
  status: chainAdapters.TxStatus.Confirmed,
  chain: ChainTypes.Ethereum,
  transfers: [
    {
      caip19: 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
      from: '0x2d44C8B87D0Ec0D19A5249aDccf3BaCc43c5afe6',
      to: '0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d',
      value: '4448382624806275089213',
      type: chainAdapters.TxType.Send
    }
  ]
}

// these test txs were on an account with a start date jan 2021
const test1: Tx = {
  address: '0xA44C286BA83Bb771cd0107B2c1Df678435Bd1535',
  blockHash: '0xc2f42f9dfbeb1c600ecd13dbcd624af1ea70631e13ad4d972b83a2a7c805360c',
  blockHeight: 13636644,
  blockTime: 1637201795,
  confirmations: 29807,
  caip2: 'eip155:1',
  txid: '0x5b25d67e43ba2cdfcb584c8069330874e838607d06b9dc64bf174547ca11e171',
  fee: {
    caip19: 'eip155:1/slip44:60',
    value: '3192000000000000'
  },
  status: chainAdapters.TxStatus.Confirmed,
  chain: ChainTypes.Ethereum,
  transfers: [
    {
      caip19: 'eip155:1/slip44:60',
      from: '0xA44C286BA83Bb771cd0107B2c1Df678435Bd1535',
      to: '0x67ffc0d460c38CeEe3a29A94def9Ff828E92E165',
      value: '230757160394687',
      type: chainAdapters.TxType.Send
    }
  ]
}

const test2: Tx = {
  address: '0xA44C286BA83Bb771cd0107B2c1Df678435Bd1535',
  blockHash: '0x2761caf9c664bb0dc9b59b18f24e7a29974c867b1181cbcefd415f881801a16e',
  blockHeight: 13508504,
  blockTime: 1635461430,
  confirmations: 157947,
  caip2: 'eip155:1',
  txid: '0x16ed49d739d0b5f56a33675a69d4f0ec85b6abdcbba0213b6242fde8646d28c5',
  fee: {
    caip19: 'eip155:1/slip44:60',
    value: '3440289843249000'
  },
  status: chainAdapters.TxStatus.Confirmed,
  chain: ChainTypes.Ethereum,
  transfers: [
    {
      caip19: 'eip155:1/slip44:60',
      from: '0xA44C286BA83Bb771cd0107B2c1Df678435Bd1535',
      to: '0x8a65ac0E23F31979db06Ec62Af62b132a6dF4741',
      value: '11746823071700259',
      type: chainAdapters.TxType.Send
    }
  ]
}

const test3: Tx = {
  address: '0xA44C286BA83Bb771cd0107B2c1Df678435Bd1535',
  blockHash: '0xe594af3d97c1ee001ab72a16671a0e05edf1ae50201eb6645dd4e5fd406e48a7',
  blockHeight: 12730373,
  blockTime: 1624989066,
  confirmations: 936078,
  caip2: 'eip155:1',
  txid: '0x62b16b9ca0526bea116917c4a563f6e47d4b8108adde2888a1d76d14fd261348',
  status: chainAdapters.TxStatus.Confirmed,
  chain: ChainTypes.Ethereum,
  transfers: [
    {
      caip19: 'eip155:1/slip44:60',
      from: '0x2ee5e455454d0ba78C337a918C6E5ff80345c1e0',
      to: '0xA44C286BA83Bb771cd0107B2c1Df678435Bd1535',
      value: '8559800000000000',
      type: chainAdapters.TxType.Receive
    }
  ]
}

const test4: Tx = {
  address: '0xA44C286BA83Bb771cd0107B2c1Df678435Bd1535',
  blockHash: '0x4e427bef8984df1c1cffcd88bbc4b3f5a62c51a3f0a315cf2c49d8783d0c7603',
  blockHeight: 12279659,
  blockTime: 1618955989,
  confirmations: 1386792,
  caip2: 'eip155:1',
  txid: '0x0c8259d5c2de8266c15bc799336dee77d7ecea9987bf9d7425a51a16d49e0647',
  fee: {
    caip19: 'eip155:1/slip44:60',
    value: '3633000000000000'
  },
  status: chainAdapters.TxStatus.Confirmed,
  chain: ChainTypes.Ethereum,
  transfers: [
    {
      caip19: 'eip155:1/slip44:60',
      from: '0xA44C286BA83Bb771cd0107B2c1Df678435Bd1535',
      to: '0xf9F6c86877C2Cf13f93B29FDa3c66d361A463Ab5',
      value: '70000000000000000',
      type: chainAdapters.TxType.Send
    }
  ]
}

const test5: Tx = {
  address: '0xA44C286BA83Bb771cd0107B2c1Df678435Bd1535',
  blockHash: '0x238168ad84a353e0245399f779ee20ef352ce303ef78681c70c5c269574375e9',
  blockHeight: 11635278,
  blockTime: 1610390199,
  confirmations: 2031173,
  caip2: 'eip155:1',
  txid: '0x7c7ba2815df596209c99fb79776f6935bd6d17f3ad5b3500d8705f8d01e2d79e',
  status: chainAdapters.TxStatus.Confirmed,
  chain: ChainTypes.Ethereum,
  transfers: [
    {
      caip19: 'eip155:1/slip44:60',
      from: '0xD3273EBa07248020bf98A8B560ec1576a612102F',
      to: '0xA44C286BA83Bb771cd0107B2c1Df678435Bd1535',
      value: '100000000000000000',
      type: chainAdapters.TxType.Receive
    }
  ]
}

const test6: Tx = {
  address: '0xA44C286BA83Bb771cd0107B2c1Df678435Bd1535',
  blockHash: '0xe6c0ce54e78c22c2297fe8d058ba3cf944b35185016a2047974532cfe0627d17',
  blockHeight: 11615644,
  blockTime: 1610129683,
  confirmations: 2050807,
  caip2: 'eip155:1',
  txid: '0x88bd4c0860a141b7d7e3675adfb50900a4e5ff5a5e8c7b80f66249b67f582872',
  status: chainAdapters.TxStatus.Confirmed,
  chain: ChainTypes.Ethereum,
  transfers: [
    {
      caip19: 'eip155:1/slip44:60',
      from: '0x563b377A956c80d77A7c613a9343699Ad6123911',
      to: '0xA44C286BA83Bb771cd0107B2c1Df678435Bd1535',
      value: '42000000000000000',
      type: chainAdapters.TxType.Receive
    }
  ]
}

// THIS IS THE NAUGHTY ONE
const test7: Tx = {
  address: '0xA44C286BA83Bb771cd0107B2c1Df678435Bd1535',
  blockHash: '0x9f24e77cfe543625ca98539f73d3f2a60d475b715a759bb5dc43334d0fa660dd',
  blockHeight: 12826450,
  blockTime: 1626283441,
  confirmations: 840458,
  caip2: 'eip155:1',
  txid: '0xf22e08bd1cd77ac589a0b7b4929ff00b3c7cac4f8b5b9e95fe30ef88caf75666',
  fee: {
    caip19: 'eip155:1/slip44:60',
    value: '5886777000000000'
  },
  status: chainAdapters.TxStatus.Confirmed,
  chain: ChainTypes.Ethereum,
  transfers: [
    {
      caip19: 'eip155:1/slip44:60',
      from: '0xA44C286BA83Bb771cd0107B2c1Df678435Bd1535',
      to: '0xA44C286BA83Bb771cd0107B2c1Df678435Bd1535',
      value: '900000000000000000000',
      type: chainAdapters.TxType.Send
    },
    {
      caip19: 'eip155:1/slip44:60',
      from: '0xA44C286BA83Bb771cd0107B2c1Df678435Bd1535',
      to: '0xA44C286BA83Bb771cd0107B2c1Df678435Bd1535',
      value: '900000000000000000000',
      type: chainAdapters.TxType.Receive
    }
  ]
}

export const testTxs = [test1, test2, test3, test4, test5, test6, test7]
