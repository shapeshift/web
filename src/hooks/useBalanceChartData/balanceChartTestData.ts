import { ChainTypes, ContractTypes, NetworkTypes } from '@shapeshiftoss/types'
import { TxStatus, TxType } from '@shapeshiftoss/types/dist/chain-adapters'
import { Tx } from 'state/slices/txHistorySlice/txHistorySlice'

export const sendERC20Tx: Tx = {
  address: '0x2d44C8B87D0Ec0D19A5249aDccf3BaCc43c5afe6',
  blockHash: '0x8e93bec969f88f472da18a88d68eaac9a4f4b6025a9e4699aedebfa8a08969c4',
  blockHeight: 13011202,
  blockTime: 1628782628,
  confirmations: 629748,
  network: NetworkTypes.MAINNET,
  txid: '0x88d774530e7b7544f86ed25e4c602a15402ac79b9617d30624c4acd3c1034769',
  fee: {
    symbol: 'ETH',
    value: '1625777000000000'
  },
  status: TxStatus.Confirmed,
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
  type: TxType.Send,
  to: '0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d'
}
