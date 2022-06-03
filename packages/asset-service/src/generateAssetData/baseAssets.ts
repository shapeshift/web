import { Asset, ChainTypes, NetworkTypes } from '@shapeshiftoss/types'

export const ethereum: Asset = {
  assetId: 'eip155:1/slip44:60',
  chainId: 'eip155:1',
  chain: ChainTypes.Ethereum,
  network: NetworkTypes.MAINNET,
  symbol: 'ETH',
  name: 'Ethereum',
  precision: 18,
  color: '#FFFFFF',
  icon: 'https://assets.coincap.io/assets/icons/256/eth.png',
  explorer: 'https://etherscan.io',
  explorerAddressLink: 'https://etherscan.io/address/',
  explorerTxLink: 'https://etherscan.io/tx/'
}

export const bitcoin: Asset = {
  assetId: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
  chainId: 'bip122:000000000019d6689c085ae165831e93',
  chain: ChainTypes.Bitcoin,
  network: NetworkTypes.MAINNET,
  symbol: 'BTC',
  name: 'Bitcoin',
  precision: 8,
  color: '#FFFFFF',
  icon: 'https://assets.coincap.io/assets/icons/256/btc.png',
  explorer: 'https://live.blockcypher.com',
  explorerAddressLink: 'https://live.blockcypher.com/btc/address/',
  explorerTxLink: 'https://live.blockcypher.com/btc/tx/'
}

export const tBitcoin: Asset = {
  assetId: 'bip122:000000000933ea01ad0ee984209779ba/slip44:0',
  chainId: 'bip122:000000000933ea01ad0ee984209779ba',
  chain: ChainTypes.Bitcoin,
  network: NetworkTypes.TESTNET,
  symbol: 'BTC',
  name: 'Bitcoin',
  precision: 8,
  color: '#FFFFFF',
  icon: 'https://assets.coincap.io/assets/icons/256/btc.png',
  explorer: 'https://live.blockcypher.com/btc-testnet/',
  explorerAddressLink: 'https://live.blockcypher.com/btc-testnet/address/',
  explorerTxLink: 'https://live.blockcypher.com/btc-testnet/tx/'
}

export const atom: Asset = {
  assetId: 'cosmos:cosmoshub-4/slip44:118',
  chainId: 'cosmos:cosmoshub-4',
  chain: ChainTypes.Cosmos,
  network: NetworkTypes.COSMOSHUB_MAINNET,
  symbol: 'ATOM',
  name: 'Cosmos',
  precision: 6,
  color: '#FFFFFF',
  icon: 'https://assets.coincap.io/assets/icons/256/atom.png',
  explorer: 'https://www.mintscan.io/cosmos',
  explorerAddressLink: 'https://www.mintscan.io/cosmos/account/',
  explorerTxLink: 'https://www.mintscan.io/cosmos/txs/'
}

export const osmosis: Asset = {
  assetId: 'cosmos:osmosis-1/slip44:118',
  chainId: 'cosmos:osmosis-1',
  chain: ChainTypes.Osmosis,
  network: NetworkTypes.OSMOSIS_MAINNET,
  symbol: 'OSMO',
  name: 'Osmosis',
  precision: 6,
  color: '#FFFFFF',
  icon: 'https://assets.coincap.io/assets/icons/osmo@2x.png',
  explorer: 'https://www.mintscan.io/osmosis',
  explorerAddressLink: 'https://www.mintscan.io/osmosis/account/',
  explorerTxLink: 'https://www.mintscan.io/osmosis/txs/'
}
