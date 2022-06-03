import { Asset, ChainTypes, NetworkTypes } from '@shapeshiftoss/types'

import { AssetsById } from './AssetService'

export const ETHMockedAsset: Asset = {
  assetId: 'eip155:1/slip44:60',
  chainId: 'eip155:1',
  chain: ChainTypes.Ethereum,
  network: NetworkTypes.MAINNET,
  symbol: 'ETH',
  name: 'Ethereum',
  precision: 18,
  color: '#FFFFFF',
  icon: 'https://assets.coincap.io/assets/icons/eth@2x.png',
  explorer: 'https://etherscan.io',
  explorerTxLink: 'https://etherscan.io/tx/',
  explorerAddressLink: 'https://etherscan.io/address/'
  // tokens: [
  //   {
  //     assetId: 'eip155:1/erc20:0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9',
  //     chainId: 'eip155:1',
  //     name: 'Aave',
  //     precision: 18,
  //     color: '#FFFFFF',
  //     secondaryColor: '#FFFFFF',
  //     icon: 'https://assets.coingecko.com/coins/images/12645/thumb/AAVE.png?1601374110',
  //     symbol: 'AAVE'
  //   },
  //   {
  //     assetId: 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
  //     chainId: 'eip155:1',
  //     name: 'Fox',
  //     precision: 18,
  //     color: '#FFFFFF',
  //     secondaryColor: '#FFFFFF',
  //     icon: 'https://assets.coincap.io/assets/icons/fox@2x.png',
  //     symbol: 'FOX'
  //   }
  // ]
}

export const BTCMockedAsset: Asset = {
  assetId: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
  chainId: 'bip122:000000000019d6689c085ae165831e93',
  chain: ChainTypes.Bitcoin,
  network: NetworkTypes.MAINNET,
  symbol: 'BTC',
  name: 'Bitcoin',
  precision: 8,
  color: '#FFFFFF',
  icon: 'https://assets.coincap.io/assets/icons/btc@2x.png',
  explorer: 'https://live.blockcypher.com',
  explorerTxLink: 'https://live.blockcypher.com/btc/tx/',
  explorerAddressLink: 'https://live.blockcypher.com/btc/address/'
}

export const mockBaseAssets: Asset[] = [
  ETHMockedAsset,
  {
    assetId: 'eip155:3/slip44:60',
    chainId: 'eip155:3',
    chain: ChainTypes.Ethereum,
    network: NetworkTypes.ETH_ROPSTEN,
    symbol: 'ETH',
    name: 'Ethereum',
    precision: 18,
    color: '#FFFFFF',
    icon: 'https://assets.coincap.io/assets/icons/eth@2x.png',
    explorer: 'https://etherscan.io',
    explorerTxLink: 'https://etherscan.io/tx/',
    explorerAddressLink: 'https://etherscan.io/address/'
    // tokens: [
    //   {
    //     assetId: 'eip155:3/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
    //     chainId: 'eip155:3',
    //     name: 'Fox',
    //     precision: 18,
    //     color: '#FFFFFF',
    //     icon: 'https://assets.coincap.io/assets/icons/fox@2x.png',
    //     symbol: 'FOX'
    //   }
    // ]
  },
  BTCMockedAsset,
  {
    assetId: 'bip122:000000000933ea01ad0ee984209779ba/slip44:0',
    chainId: 'bip122:000000000933ea01ad0ee984209779ba',
    chain: ChainTypes.Bitcoin,
    network: NetworkTypes.TESTNET,
    symbol: 'BTC',
    name: 'Bitcoin',
    precision: 8,
    color: '#FFFFFF',
    icon: 'https://assets.coincap.io/assets/icons/btc@2x.png',
    explorer: 'https://live.blockcypher.com/btc-testnet/',
    explorerTxLink: 'https://live.blockcypher.com/btc-testnet/tx/',
    explorerAddressLink: 'https://live.blockcypher.com/btc-testnet/address/'
  }
]

export const mockAssets: Asset[] = [
  {
    assetId: 'eip155:1/slip44:60',
    chainId: 'eip155:1',
    chain: ChainTypes.Ethereum,
    network: NetworkTypes.MAINNET,
    symbol: 'ETH',
    name: 'Ethereum',
    precision: 18,
    color: '#FFFFFF',
    icon: 'https://assets.coincap.io/assets/icons/eth@2x.png',
    explorer: 'https://etherscan.io',
    explorerTxLink: 'https://etherscan.io/tx/',
    explorerAddressLink: 'https://etherscan.io/address/'
  },
  {
    assetId: 'eip155:1/erc20:0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9',
    chainId: 'eip155:1',
    name: 'Aave',
    precision: 18,
    color: '#FFFFFF',
    icon: 'https://assets.coingecko.com/coins/images/12645/thumb/AAVE.png?1601374110',
    symbol: 'AAVE',
    chain: ChainTypes.Ethereum,
    network: NetworkTypes.MAINNET,
    explorer: 'https://etherscan.io',
    explorerTxLink: 'https://etherscan.io/tx/',
    explorerAddressLink: 'https://etherscan.io/address/'
  },
  {
    assetId: 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
    chainId: 'eip155:1',
    name: 'Fox',
    precision: 18,
    color: '#FFFFFF',
    icon: 'https://assets.coincap.io/assets/icons/fox@2x.png',
    symbol: 'FOX',
    chain: ChainTypes.Ethereum,
    network: NetworkTypes.MAINNET,
    explorer: 'https://etherscan.io',
    explorerTxLink: 'https://etherscan.io/tx/',
    explorerAddressLink: 'https://etherscan.io/address/'
  },
  {
    assetId: 'eip155:3/slip44:60',
    chainId: 'eip155:3',
    chain: ChainTypes.Ethereum,
    network: NetworkTypes.ETH_ROPSTEN,
    symbol: 'ETH',
    name: 'Ethereum',
    precision: 18,
    color: '#FFFFFF',
    icon: 'https://assets.coincap.io/assets/icons/eth@2x.png',
    explorer: 'https://etherscan.io',
    explorerTxLink: 'https://etherscan.io/tx/',
    explorerAddressLink: 'https://etherscan.io/address/'
  },
  {
    assetId: 'eip155:3/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
    chainId: 'eip155:3',
    name: 'Fox',
    precision: 18,
    color: '#FFFFFF',
    icon: 'https://assets.coincap.io/assets/icons/fox@2x.png',
    symbol: 'FOX',
    chain: ChainTypes.Ethereum,
    network: NetworkTypes.ETH_ROPSTEN,
    explorer: 'https://etherscan.io',
    explorerTxLink: 'https://etherscan.io/tx/',
    explorerAddressLink: 'https://etherscan.io/address/'
  },
  {
    assetId: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
    chainId: 'bip122:000000000019d6689c085ae165831e93',
    chain: ChainTypes.Bitcoin,
    network: NetworkTypes.MAINNET,
    symbol: 'BTC',
    name: 'Bitcoin',
    precision: 8,
    color: '#FFFFFF',
    icon: 'https://assets.coincap.io/assets/icons/btc@2x.png',
    explorer: 'https://live.blockcypher.com',
    explorerTxLink: 'https://live.blockcypher.com/btc/tx/',
    explorerAddressLink: 'https://live.blockcypher.com/btc/address/'
  },
  {
    assetId: 'bip122:000000000933ea01ad0ee984209779ba/slip44:0',
    chainId: 'bip122:000000000933ea01ad0ee984209779ba',
    chain: ChainTypes.Bitcoin,
    network: NetworkTypes.TESTNET,
    symbol: 'BTC',
    name: 'Bitcoin',
    precision: 8,
    color: '#FFFFFF',
    icon: 'https://assets.coincap.io/assets/icons/btc@2x.png',
    explorer: 'https://live.blockcypher.com/btc-testnet/',
    explorerTxLink: 'https://live.blockcypher.com/btc-testnet/tx/',
    explorerAddressLink: 'https://live.blockcypher.com/btc-testnet/address/'
  }
]

export const mockIndexedAssetData: AssetsById = {
  ethereum_MAINNET: {
    assetId: 'eip155:1/slip44:60',
    chainId: 'eip155:1',
    chain: ChainTypes.Ethereum,
    network: NetworkTypes.MAINNET,
    symbol: 'ETH',
    name: 'Ethereum',
    precision: 18,
    color: '#FFFFFF',
    icon: 'https://assets.coincap.io/assets/icons/eth@2x.png',
    explorer: 'https://etherscan.io',
    explorerTxLink: 'https://etherscan.io/tx/',
    explorerAddressLink: 'https://etherscan.io/address/'
  },
  ethereum_MAINNET_0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9: {
    assetId: 'eip155:1/erc20:0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9',
    chainId: 'eip155:1',
    name: 'Aave',
    precision: 18,
    color: '#FFFFFF',
    icon: 'https://assets.coingecko.com/coins/images/12645/thumb/AAVE.png?1601374110',
    symbol: 'AAVE',
    chain: ChainTypes.Ethereum,
    network: NetworkTypes.MAINNET,
    explorer: 'https://etherscan.io',
    explorerAddressLink: 'https://etherscan.io/address/',
    explorerTxLink: 'https://etherscan.io/tx/'
  },
  ethereum_MAINNET_0xc770eefad204b5180df6a14ee197d99d808ee52d: {
    assetId: 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
    chainId: 'eip155:1',
    name: 'Fox',
    precision: 18,
    color: '#FFFFFF',
    icon: 'https://assets.coincap.io/assets/icons/fox@2x.png',
    symbol: 'FOX',
    chain: ChainTypes.Ethereum,
    network: NetworkTypes.MAINNET,
    explorer: 'https://etherscan.io',
    explorerAddressLink: 'https://etherscan.io/address/',
    explorerTxLink: 'https://etherscan.io/tx/'
  },
  ethereum_ETH_ROPSTEN: {
    assetId: 'eip155:3/slip44:60',
    chainId: 'eip155:3',
    chain: ChainTypes.Ethereum,
    network: NetworkTypes.ETH_ROPSTEN,
    symbol: 'ETH',
    name: 'Ethereum',
    precision: 18,
    color: '#FFFFFF',
    icon: 'https://assets.coincap.io/assets/icons/eth@2x.png',
    explorer: 'https://etherscan.io',
    explorerTxLink: 'https://etherscan.io/tx/',
    explorerAddressLink: 'https://etherscan.io/address/'
  },
  ethereum_ETH_ROPSTEN_0xc770eefad204b5180df6a14ee197d99d808ee52d: {
    assetId: 'eip155:3/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
    chainId: 'eip155:3',
    name: 'Fox',
    precision: 18,
    color: '#FFFFFF',
    icon: 'https://assets.coincap.io/assets/icons/fox@2x.png',
    symbol: 'FOX',
    chain: ChainTypes.Ethereum,
    network: NetworkTypes.ETH_ROPSTEN,
    explorer: 'https://etherscan.io',
    explorerTxLink: 'https://etherscan.io/tx/',
    explorerAddressLink: 'https://etherscan.io/address/'
  },
  bitcoin_MAINNET: {
    assetId: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
    chainId: 'bip122:000000000019d6689c085ae165831e93',
    chain: ChainTypes.Bitcoin,
    network: NetworkTypes.MAINNET,
    symbol: 'BTC',
    name: 'Bitcoin',
    precision: 8,
    color: '#FFFFFF',
    icon: 'https://assets.coincap.io/assets/icons/btc@2x.png',
    explorer: 'https://live.blockcypher.com',
    explorerTxLink: 'https://live.blockcypher.com/btc/tx/',
    explorerAddressLink: 'https://live.blockcypher.com/btc/address/'
  },
  bitcoin_TESTNET: {
    assetId: 'bip122:000000000933ea01ad0ee984209779ba/slip44:0',
    chainId: 'bip122:000000000933ea01ad0ee984209779ba',
    chain: ChainTypes.Bitcoin,
    network: NetworkTypes.TESTNET,
    symbol: 'BTC',
    name: 'Bitcoin',
    precision: 8,
    color: '#FFFFFF',
    icon: 'https://assets.coincap.io/assets/icons/btc@2x.png',
    explorer: 'https://live.blockcypher.com/btc-testnet/',
    explorerTxLink: 'https://live.blockcypher.com/btc-testnet/tx/',
    explorerAddressLink: 'https://live.blockcypher.com/btc-testnet/address/'
  }
}
