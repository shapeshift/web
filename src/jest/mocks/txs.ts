import { chainAdapters, ChainTypes, ContractTypes, NetworkTypes } from '@shapeshiftoss/types'
import { Tx } from 'state/slices/txHistorySlice/txHistorySlice'

export const EthSend: Tx = {
  address: '0x9124248f2AD8c94fC4a403588BE7a77984B34bb8',
  blockHash: '0x5edb4bbd1c33026053bd886b898bf6424b36e4b8fe3f4c8e2b6abc83079ed89b',
  blockHeight: 13468273,
  blockTime: 1634917507,
  chain: ChainTypes.Ethereum,
  confirmations: 875,
  network: NetworkTypes.MAINNET,
  txid: '0xb8c6eef6bfa02a60b5e00f5c84994084065efeb3bee0259dfc133e28f760a58b',
  fee: { value: '2234067070809000', symbol: 'ETH' },
  asset: 'ethereum',
  value: '250923588302732',
  chainSpecific: {},
  type: chainAdapters.TxType.Send,
  to: '0x9124248f2AD8c94fC4a403588BE7a77984B34bb8',
  status: chainAdapters.TxStatus.Confirmed
}

export const EthReceive: Tx = {
  address: '0x9124248f2AD8c94fC4a403588BE7a77984B34bb8',
  blockHash: '0x5edb4bbd1c33026053bd886b898bf6424b36e4b8fe3f4c8e2b6abc83079ed89b',
  blockHeight: 13468273,
  blockTime: 1634917507,
  chain: ChainTypes.Ethereum,
  confirmations: 875,
  network: NetworkTypes.MAINNET,
  txid: '0xb8c6eef6bfa02a60b5e00f5c84994084065efeb3bee0259dfc133e28f760a59b',
  fee: { value: '2234067070809000', symbol: 'ETH' },
  asset: 'ethereum',
  value: '250923588302732',
  chainSpecific: {},
  type: chainAdapters.TxType.Receive,
  from: '0x9124248f2AD8c94fC4a403588BE7a77984B34bb8',
  status: chainAdapters.TxStatus.Confirmed
}

export const BtcSend: Tx = {
  address: 'bc1q2v8pww5t2qmgwteypn535hxa0uegrc7hvper7w',
  blockHash: 'e12cb64834058bb785b7b8932f079deafc3633f999f722779ee9de351273af65',
  blockHeight: 13468273,
  blockTime: 1634917507,
  chain: ChainTypes.Bitcoin,
  confirmations: 875,
  network: NetworkTypes.MAINNET,
  txid: 'e12cb64834058bb785b7b8932f079deafc3633f999f722779ee9de351273af65',
  fee: { value: '2234067070809000', symbol: 'BTC' },
  asset: 'bitcoin',
  value: '250923588302732',
  chainSpecific: {},
  type: chainAdapters.TxType.Send,
  to: 'bc1q2v8pww5t2qmgwteypn535hxa0uegrc7hvper7w',
  status: chainAdapters.TxStatus.Confirmed
}

export const FOXSend: Tx = {
  address: '0x2d44C8B87D0Ec0D19A5249aDccf3BaCc43c5afe6',
  blockHash: '0x8e93bec969f88f472da18a88d68eaac9a4f4b6025a9e4699aedebfa8a08969c4',
  blockHeight: 13011202,
  // unchained uses seconds, Z gives UTC timezone
  blockTime: new Date('2021-10-31T23:30:01Z').valueOf() / 1000,
  confirmations: 629748,
  network: NetworkTypes.MAINNET,
  txid: '0x88d774530e7b7544f86ed25e4c602a15402ac79b9617d30624c4acd3c1034769',
  fee: {
    symbol: 'ETH',
    value: '1625777000000000'
  },
  status: chainAdapters.TxStatus.Confirmed,
  asset: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
  value: '4448382624806275089213',
  chainSpecific: {
    token: {
      contract: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
      contractType: ContractTypes.ERC20,
      name: 'FOX',
      precision: 18,
      symbol: 'FOX'
    }
  },
  chain: ChainTypes.Ethereum,
  type: chainAdapters.TxType.Send,
  to: '0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d'
}
