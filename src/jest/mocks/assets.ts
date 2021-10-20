import { Asset, ChainTypes, ContractTypes, NetworkTypes } from '@shapeshiftoss/types'

export const rune: Asset = {
  name: 'THORChain  ERC20 ',
  precision: 18,
  tokenId: '0x3155ba85d5f96b2d030a4966af206230e46849cb',
  contractType: ContractTypes.ERC20,
  color: '#FFFFFF',
  secondaryColor: '#FFFFFF',
  icon: 'https://assets.coingecko.com/coins/images/13677/thumb/IMG_20210123_132049_458.png?1612179252',
  explorer: 'https://etherscan.io',
  explorerTxLink: 'https://etherscan.io/tx/',
  sendSupport: true,
  receiveSupport: true,
  symbol: 'RUNE',
  chain: ChainTypes.Ethereum,
  network: NetworkTypes.MAINNET,
  slip44: 60
}

export const ethereum: Asset = {
  chain: ChainTypes.Ethereum,
  network: NetworkTypes.MAINNET,
  symbol: 'ETH',
  name: 'Ethereum',
  precision: 18,
  slip44: 60,
  color: '#FFFFFF',
  secondaryColor: '#FFFFFF',
  icon: 'https://assets.coincap.io/assets/icons/eth@2x.png',
  explorer: 'https://etherscan.io',
  explorerTxLink: 'https://etherscan.io/tx/',
  sendSupport: true,
  receiveSupport: true
}

export const aapl: Asset = {
  chain: ChainTypes.Ethereum,
  network: NetworkTypes.MAINNET,
  color: '#FFFFFF',
  contractType: ContractTypes.ERC20,
  explorer: 'https://etherscan.io',
  explorerTxLink: 'https://etherscan.io/tx/',
  icon: 'https://assets.coingecko.com/coins/images/12367/thumb/oF1_9R1K_400x400.jpg?1599345463',
  name: ' AAPL',
  precision: 18,
  receiveSupport: true,
  secondaryColor: '#FFFFFF',
  sendSupport: true,
  slip44: 60,
  symbol: 'AAPL',
  tokenId: '0x41efc0253ee7ea44400abb5f907fdbfdebc82bec'
}

export const zero: Asset = {
  chain: ChainTypes.Ethereum,
  network: NetworkTypes.MAINNET,
  color: '#FFFFFF',
  contractType: ContractTypes.ERC20,
  explorer: 'https://etherscan.io',
  explorerTxLink: 'https://etherscan.io/tx/',
  icon: 'https://assets.coingecko.com/coins/images/13706/thumb/0.exchange_%28logo%29.jpg?1617070530',
  name: '0 exchange',
  precision: 18,
  receiveSupport: true,
  secondaryColor: '#FFFFFF',
  sendSupport: true,
  slip44: 60,
  symbol: 'ZERO',
  tokenId: '0xf0939011a9bb95c3b791f0cb546377ed2693a574'
}

export const fox: Asset = {
  chain: ChainTypes.Ethereum,
  network: NetworkTypes.MAINNET,
  color: '#FFFFFF',
  contractType: ContractTypes.ERC20,
  explorer: 'https://etherscan.io',
  explorerTxLink: 'https://etherscan.io/tx/',
  icon: 'https://assets.coincap.io/assets/icons/fox@2x.png',
  name: 'Fox',
  precision: 18,
  receiveSupport: true,
  secondaryColor: '#FFFFFF',
  sendSupport: true,
  slip44: 60,
  symbol: 'FOX',
  tokenId: '0xc770eefad204b5180df6a14ee197d99d808ee52d'
}
