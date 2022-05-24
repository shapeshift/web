import { AssetDataSource, BaseAsset, ChainTypes, NetworkTypes } from '@shapeshiftoss/types'

export const ethereum: BaseAsset = {
  assetId: 'eip155:1/slip44:60',
  chainId: 'eip155:1',
  chain: ChainTypes.Ethereum,
  dataSource: AssetDataSource.CoinGecko,
  network: NetworkTypes.MAINNET,
  symbol: 'ETH',
  name: 'Ethereum',
  precision: 18,
  slip44: 60,
  color: '#FFFFFF',
  secondaryColor: '#FFFFFF',
  icon: 'https://assets.coincap.io/assets/icons/256/eth.png',
  explorer: 'https://etherscan.io',
  explorerAddressLink: 'https://etherscan.io/address/',
  explorerTxLink: 'https://etherscan.io/tx/',
  sendSupport: true,
  receiveSupport: true
}

export const bitcoin: BaseAsset = {
  assetId: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
  chainId: 'bip122:000000000019d6689c085ae165831e93',
  chain: ChainTypes.Bitcoin,
  dataSource: AssetDataSource.CoinGecko,
  network: NetworkTypes.MAINNET,
  symbol: 'BTC',
  name: 'Bitcoin',
  precision: 8,
  slip44: 0,
  color: '#FFFFFF',
  secondaryColor: '#FFFFFF',
  icon: 'https://assets.coincap.io/assets/icons/256/btc.png',
  explorer: 'https://live.blockcypher.com',
  explorerAddressLink: 'https://live.blockcypher.com/btc/address/',
  explorerTxLink: 'https://live.blockcypher.com/btc/tx/',
  sendSupport: false,
  receiveSupport: false
}

export const tBitcoin: BaseAsset = {
  assetId: 'bip122:000000000933ea01ad0ee984209779ba/slip44:0',
  chainId: 'bip122:000000000933ea01ad0ee984209779ba',
  chain: ChainTypes.Bitcoin,
  dataSource: AssetDataSource.CoinGecko,
  network: NetworkTypes.TESTNET,
  symbol: 'BTC',
  name: 'Bitcoin',
  precision: 8,
  slip44: 1,
  color: '#FFFFFF',
  secondaryColor: '#FFFFFF',
  icon: 'https://assets.coincap.io/assets/icons/256/btc.png',
  explorer: 'https://live.blockcypher.com/btc-testnet/',
  explorerAddressLink: 'https://live.blockcypher.com/btc-testnet/address/',
  explorerTxLink: 'https://live.blockcypher.com/btc-testnet/tx/',
  sendSupport: false,
  receiveSupport: false
}

export const tEthereum: BaseAsset = {
  assetId: 'eip155:3/slip44:60',
  chainId: 'eip155:3',
  chain: ChainTypes.Ethereum,
  dataSource: AssetDataSource.CoinGecko,
  network: NetworkTypes.ETH_ROPSTEN,
  symbol: 'ETH',
  name: 'Ropsten Testnet Ethereum',
  precision: 18,
  slip44: 1,
  color: '#FFFFFF',
  secondaryColor: '#FFFFFF',
  icon: 'https://assets.coincap.io/assets/icons/256/eth.png',
  explorer: 'https://ropsten.etherscan.io/',
  explorerAddressLink: 'https://ropsten.etherscan.io/address/',
  explorerTxLink: 'https://ropsten.etherscan.io/tx/',
  sendSupport: false,
  receiveSupport: false,
  tokens: [
    {
      assetId: 'eip155:3/erc20:0x1da00b6fc705f2ce4c25d7e7add25a3cc045e54a',
      chainId: 'eip155:3',
      name: 'Test Token',
      precision: 18,
      tokenId: '0x1da00b6fc705f2ce4c25d7e7add25a3cc045e54a',
      contractType: 'erc20',
      color: '#FFFFFF',
      dataSource: AssetDataSource.CoinGecko,
      secondaryColor: '#FFFFFF',
      icon: 'https://assets.coingecko.com/coins/images/17049/thumb/BUNNY.png?1626148809',
      sendSupport: true,
      receiveSupport: true,
      symbol: 'TST'
    }
  ]
}

export const atom: BaseAsset = {
  assetId: 'cosmos:cosmoshub-4/slip44:118',
  chainId: 'cosmos:cosmoshub-4',
  chain: ChainTypes.Cosmos,
  dataSource: AssetDataSource.CoinGecko,
  network: NetworkTypes.COSMOSHUB_MAINNET,
  symbol: 'ATOM',
  name: 'Cosmos',
  precision: 6,
  slip44: 118,
  color: '#FFFFFF',
  secondaryColor: '#FFFFFF',
  icon: 'https://assets.coincap.io/assets/icons/256/atom.png',
  explorer: 'https://www.mintscan.io/cosmos',
  explorerAddressLink: 'https://www.mintscan.io/cosmos/account/',
  explorerTxLink: 'https://www.mintscan.io/cosmos/txs/',
  sendSupport: true,
  receiveSupport: true
}

export const osmosis: BaseAsset = {
  assetId: 'cosmos:osmosis-1/slip44:118',
  chainId: 'cosmos:osmosis-1',
  chain: ChainTypes.Osmosis,
  dataSource: AssetDataSource.CoinGecko,
  network: NetworkTypes.OSMOSIS_MAINNET,
  symbol: 'OSMO',
  name: 'Osmosis',
  precision: 6,
  slip44: 118,
  color: '#FFFFFF',
  secondaryColor: '#FFFFFF',
  icon: 'https://assets.coincap.io/assets/icons/osmo@2x.png',
  explorer: 'https://www.mintscan.io/osmosis',
  explorerAddressLink: 'https://www.mintscan.io/osmosis/account/',
  explorerTxLink: 'https://www.mintscan.io/osmosis/txs/',
  sendSupport: true,
  receiveSupport: true
}
