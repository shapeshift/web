import { Asset, ChainTypes, NetworkTypes } from '@shapeshiftoss/types'

export const BTC: Asset = {
  assetId: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
  chainId: 'bip122:000000000019d6689c085ae165831e93',
  name: 'bitcoin',
  chain: ChainTypes.Bitcoin,
  network: NetworkTypes.MAINNET,
  precision: 8,
  color: '#FFFFFF',
  icon: 'https://assets.coincap.io/assets/icons/btc@2x.png',
  explorer: 'https://live.blockcypher.com',
  explorerTxLink: 'https://live.blockcypher.com/btc/tx/',
  explorerAddressLink: 'https://live.blockcypher.com/btc/address/',
  symbol: 'BTC'
}

export const WETH: Asset = {
  assetId: 'eip155:1/erc20:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  chainId: 'eip155:1',
  name: 'WETH',
  chain: ChainTypes.Ethereum,
  network: NetworkTypes.MAINNET,
  precision: 18,
  color: '#FFFFFF',
  icon: 'https://assets.coingecko.com/coins/images/2518/thumb/weth.png?1628852295',
  explorer: 'https://etherscan.io',
  explorerTxLink: 'https://etherscan.io/tx/',
  explorerAddressLink: 'https://etherscan.io/address/',
  symbol: 'WETH'
}

export const FOX: Asset = {
  assetId: 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
  chainId: 'eip155:1',
  name: 'FOX',
  chain: ChainTypes.Ethereum,
  network: NetworkTypes.MAINNET,
  precision: 18,
  color: '#FFFFFF',
  icon: 'https://assets.coincap.io/assets/icons/fox@2x.png',
  explorer: 'https://etherscan.io',
  explorerTxLink: 'https://etherscan.io/tx/',
  explorerAddressLink: 'https://etherscan.io/address/',
  symbol: 'FOX'
}
