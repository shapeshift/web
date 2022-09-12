import * as caip from '@shapeshiftoss/caip'

import { Asset } from '../service/AssetService'

export const ethereum: Asset = {
  assetId: caip.ethAssetId,
  chainId: caip.ethChainId,
  symbol: 'ETH',
  name: 'Ethereum',
  precision: 18,
  color: '#5C6BC0',
  icon: 'https://assets.coincap.io/assets/icons/256/eth.png',
  explorer: 'https://etherscan.io',
  explorerAddressLink: 'https://etherscan.io/address/',
  explorerTxLink: 'https://etherscan.io/tx/',
}

export const bitcoin: Asset = {
  assetId: caip.btcAssetId,
  chainId: caip.btcChainId,
  symbol: 'BTC',
  name: 'Bitcoin',
  precision: 8,
  color: '#FF9800',
  icon: 'https://assets.coincap.io/assets/icons/256/btc.png',
  explorer: 'https://live.blockcypher.com',
  explorerAddressLink: 'https://live.blockcypher.com/btc/address/',
  explorerTxLink: 'https://live.blockcypher.com/btc/tx/',
}

export const bitcoincash: Asset = {
  assetId: caip.bchAssetId,
  chainId: caip.bchChainId,
  symbol: 'BCH',
  name: 'Bitcoin Cash',
  precision: 8,
  color: '#8BC34A',
  icon: 'https://assets.coincap.io/assets/icons/256/bch.png',
  explorer: 'https://blockchair.com',
  explorerAddressLink: 'https://blockchair.com/bitcoin-cash/address/',
  explorerTxLink: 'https://blockchair.com/bitcoin-cash/transaction/',
}

export const dogecoin: Asset = {
  assetId: caip.dogeAssetId,
  chainId: caip.dogeChainId,
  symbol: 'DOGE',
  name: 'Dogecoin',
  precision: 8,
  color: '#FFC107',
  icon: 'https://assets.coincap.io/assets/icons/256/doge.png',
  explorer: 'https://live.blockcypher.com',
  explorerAddressLink: 'https://live.blockcypher.com/doge/address/',
  explorerTxLink: 'https://live.blockcypher.com/doge/tx/',
}

export const litecoin: Asset = {
  assetId: caip.ltcAssetId,
  chainId: caip.ltcChainId,
  symbol: 'LTC',
  name: 'Litecoin',
  precision: 8,
  color: '#B8B8B8',
  icon: 'https://assets.coincap.io/assets/icons/256/ltc.png',
  explorer: 'https://live.blockcypher.com',
  explorerAddressLink: 'https://live.blockcypher.com/ltc/address/',
  explorerTxLink: 'https://live.blockcypher.com/ltc/tx/',
}

export const atom: Asset = {
  assetId: caip.cosmosAssetId,
  chainId: caip.cosmosChainId,
  symbol: 'ATOM',
  name: 'Cosmos',
  precision: 6,
  color: '#303F9F',
  icon: 'https://assets.coincap.io/assets/icons/256/atom.png',
  explorer: 'https://www.mintscan.io/cosmos',
  explorerAddressLink: 'https://www.mintscan.io/cosmos/account/',
  explorerTxLink: 'https://www.mintscan.io/cosmos/txs/',
}

export const osmosis: Asset = {
  assetId: caip.osmosisAssetId,
  chainId: caip.osmosisChainId,
  symbol: 'OSMO',
  name: 'Osmosis',
  precision: 6,
  color: '#750BBB',
  icon: 'https://assets.coincap.io/assets/icons/osmo@2x.png',
  explorer: 'https://www.mintscan.io/osmosis',
  explorerAddressLink: 'https://www.mintscan.io/osmosis/account/',
  explorerTxLink: 'https://www.mintscan.io/osmosis/txs/',
}

export const avax: Asset = {
  assetId: caip.avalancheAssetId,
  chainId: caip.avalancheChainId,
  name: 'Avalanche',
  symbol: 'AVAX',
  precision: 18,
  color: '#FFFFFF', // this will get picked up by the color generation script,
  icon: 'https://rawcdn.githack.com/trustwallet/assets/32e51d582a890b3dd3135fe3ee7c20c2fd699a6d/blockchains/avalanchec/info/logo.png',
  explorer: 'https://snowtrace.io',
  explorerAddressLink: 'https://snowtrace.io/address/',
  explorerTxLink: 'https://snowtrace.io/tx/',
}

export const thorchain: Asset = {
  assetId: caip.thorchainAssetId,
  chainId: caip.thorchainChainId,
  name: 'THORChain',
  symbol: 'RUNE',
  precision: 8,
  color: '#33FF99',
  icon: 'https://assets.coincap.io/assets/icons/rune@2x.png',
  explorer: 'https://viewblock.io/thorchain',
  explorerAddressLink: 'https://viewblock.io/thorchain/address/',
  explorerTxLink: 'https://viewblock.io/thorchain/tx/',
}
