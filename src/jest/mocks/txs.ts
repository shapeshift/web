import { chainAdapters, ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
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
