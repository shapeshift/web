import * as caip from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'

type AssetWithNetworkName = Asset & { networkName: string }

export const ethereum: AssetWithNetworkName = {
  assetId: caip.ethAssetId,
  chainId: caip.ethChainId,
  symbol: 'ETH',
  name: 'Ethereum',
  networkName: 'Ethereum',
  precision: 18,
  color: '#5C6BC0',
  icon: 'https://raw.githubusercontent.com/trustwallet/assets/32e51d582a890b3dd3135fe3ee7c20c2fd699a6d/blockchains/ethereum/info/logo.png',
  explorer: 'https://etherscan.io',
  explorerAddressLink: 'https://etherscan.io/address/',
  explorerTxLink: 'https://etherscan.io/tx/',
}

export const bitcoin: AssetWithNetworkName = {
  assetId: caip.btcAssetId,
  chainId: caip.btcChainId,
  symbol: 'BTC',
  name: 'Bitcoin',
  networkName: 'Bitcoin',
  precision: 8,
  color: '#FF9800',
  icon: 'https://assets.coingecko.com/coins/images/1/standard/bitcoin.png?1696501400',
  explorer: 'https://live.blockcypher.com',
  explorerAddressLink: 'https://live.blockcypher.com/btc/address/',
  explorerTxLink: 'https://live.blockcypher.com/btc/tx/',
}

export const bitcoincash: AssetWithNetworkName = {
  assetId: caip.bchAssetId,
  chainId: caip.bchChainId,
  symbol: 'BCH',
  name: 'Bitcoin Cash',
  networkName: 'Bitcoin Cash',
  precision: 8,
  color: '#8BC34A',
  icon: 'https://assets.coingecko.com/coins/images/780/standard/bitcoin-cash-circle.png?1696501932',
  explorer: 'https://blockchair.com',
  explorerAddressLink: 'https://blockchair.com/bitcoin-cash/address/',
  explorerTxLink: 'https://blockchair.com/bitcoin-cash/transaction/',
}

export const dogecoin: AssetWithNetworkName = {
  assetId: caip.dogeAssetId,
  chainId: caip.dogeChainId,
  symbol: 'DOGE',
  name: 'Dogecoin',
  networkName: 'Dogecoin',
  precision: 8,
  color: '#FFC107',
  icon: 'https://assets.coingecko.com/coins/images/5/standard/dogecoin.png?1696501409',
  explorer: 'https://live.blockcypher.com',
  explorerAddressLink: 'https://live.blockcypher.com/doge/address/',
  explorerTxLink: 'https://live.blockcypher.com/doge/tx/',
}

export const litecoin: AssetWithNetworkName = {
  assetId: caip.ltcAssetId,
  chainId: caip.ltcChainId,
  symbol: 'LTC',
  name: 'Litecoin',
  networkName: 'Litecoin',
  precision: 8,
  color: '#B8B8B8',
  icon: 'https://assets.coingecko.com/coins/images/2/standard/litecoin.png?1696501400',
  explorer: 'https://live.blockcypher.com',
  explorerAddressLink: 'https://live.blockcypher.com/ltc/address/',
  explorerTxLink: 'https://live.blockcypher.com/ltc/tx/',
}

export const atom: AssetWithNetworkName = {
  assetId: caip.cosmosAssetId,
  chainId: caip.cosmosChainId,
  symbol: 'ATOM',
  name: 'Cosmos',
  networkName: 'Cosmos',
  precision: 6,
  color: '#303F9F',
  icon: 'https://assets.coingecko.com/coins/images/1481/standard/cosmos_hub.png?1696502525',
  explorer: 'https://www.mintscan.io/cosmos',
  explorerAddressLink: 'https://www.mintscan.io/cosmos/account/',
  explorerTxLink: 'https://www.mintscan.io/cosmos/txs/',
}

export const avax: AssetWithNetworkName = {
  assetId: caip.avalancheAssetId,
  chainId: caip.avalancheChainId,
  name: 'Avalanche',
  networkName: 'Avalanche C-Chain',
  symbol: 'AVAX',
  precision: 18,
  color: '#FFFFFF', // this will get picked up by the color generation script,
  icon: 'https://assets.coingecko.com/coins/images/12559/standard/Avalanche_Circle_RedWhite_Trans.png?1696512369',
  explorer: 'https://snowtrace.dev',
  explorerAddressLink: 'https://snowtrace.dev/address/',
  explorerTxLink: 'https://snowtrace.dev/tx/',
}

export const thorchain: AssetWithNetworkName = {
  assetId: caip.thorchainAssetId,
  chainId: caip.thorchainChainId,
  name: 'THORChain',
  networkName: 'THORChain',
  symbol: 'RUNE',
  precision: 8,
  color: '#33FF99',
  icon: 'https://assets.coingecko.com/coins/images/6595/standard/Rune200x200.png?1696506946',
  explorer: 'https://viewblock.io/thorchain',
  explorerAddressLink: 'https://viewblock.io/thorchain/address/',
  explorerTxLink: 'https://viewblock.io/thorchain/tx/',
}

export const optimism: AssetWithNetworkName = {
  assetId: caip.optimismAssetId,
  chainId: caip.optimismChainId,
  name: 'Ethereum',
  networkName: 'Optimism',
  symbol: 'ETH',
  precision: 18,
  color: '#5C6BC0',
  networkColor: '#FC0424',
  icon: 'https://raw.githubusercontent.com/trustwallet/assets/32e51d582a890b3dd3135fe3ee7c20c2fd699a6d/blockchains/ethereum/info/logo.png',
  networkIcon: 'https://assets.coingecko.com/coins/images/25244/large/Optimism.png?1660904599',
  explorer: 'https://optimistic.etherscan.io',
  explorerAddressLink: 'https://optimistic.etherscan.io/address/',
  explorerTxLink: 'https://optimistic.etherscan.io/tx/',
}

export const bnbsmartchain: AssetWithNetworkName = {
  assetId: caip.bscAssetId,
  chainId: caip.bscChainId,
  name: 'BNB',
  networkName: 'BNB Smart Chain',
  symbol: 'BNB',
  precision: 18,
  color: '#F0B90B',
  icon: 'https://assets.coingecko.com/coins/images/825/standard/bnb-icon2_2x.png?1696501970',
  explorer: 'https://bscscan.com',
  explorerAddressLink: 'https://bscscan.com/address/',
  explorerTxLink: 'https://bscscan.com/tx/',
}

export const polygon: AssetWithNetworkName = {
  assetId: caip.polygonAssetId,
  chainId: caip.polygonChainId,
  name: 'Polygon',
  networkName: 'Polygon',
  symbol: 'MATIC',
  precision: 18,
  color: '#8f00ff',
  icon: 'https://assets.coingecko.com/coins/images/4713/large/matic-token-icon.png?1624446912',
  explorer: 'https://polygonscan.com/',
  explorerAddressLink: 'https://polygonscan.com/address/',
  explorerTxLink: 'https://polygonscan.com/tx/',
}

export const gnosis: AssetWithNetworkName = {
  assetId: caip.gnosisAssetId,
  chainId: caip.gnosisChainId,
  name: 'xDAI',
  networkName: 'Gnosis',
  symbol: 'xDAI',
  precision: 18,
  color: '#33765c',
  icon: 'https://assets.coingecko.com/coins/images/11062/large/Identity-Primary-DarkBG.png?1638372986',
  networkIcon:
    'https://assets.coingecko.com/asset_platforms/images/11062/large/Aatar_green_white.png?1643204471',
  explorer: 'https://gnosis.blockscout.com/',
  explorerAddressLink: 'https://gnosis.blockscout.com/address/',
  explorerTxLink: 'https://gnosis.blockscout.com/tx/',
}

export const arbitrum: AssetWithNetworkName = {
  assetId: caip.arbitrumAssetId,
  chainId: caip.arbitrumChainId,
  name: 'Ethereum',
  networkName: 'Arbitrum One',
  symbol: 'ETH',
  precision: 18,
  color: '#5C6BC0',
  networkColor: '#213147',
  icon: 'https://raw.githubusercontent.com/trustwallet/assets/32e51d582a890b3dd3135fe3ee7c20c2fd699a6d/blockchains/ethereum/info/logo.png',
  networkIcon:
    'https://assets.coingecko.com/coins/images/16547/large/photo_2023-03-29_21.47.00.jpeg?1680097630',
  explorer: 'https://arbiscan.io',
  explorerAddressLink: 'https://arbiscan.io/address/',
  explorerTxLink: 'https://arbiscan.io/tx/',
}

export const arbitrumNova: AssetWithNetworkName = {
  assetId: caip.arbitrumNovaAssetId,
  chainId: caip.arbitrumNovaChainId,
  name: 'Ethereum',
  networkName: 'Arbitrum Nova',
  symbol: 'ETH',
  precision: 18,
  color: '#5C6BC0',
  networkColor: '#E67408',
  icon: 'https://raw.githubusercontent.com/trustwallet/assets/32e51d582a890b3dd3135fe3ee7c20c2fd699a6d/blockchains/ethereum/info/logo.png',
  networkIcon:
    'https://assets.coingecko.com/asset_platforms/images/93/large/AN_logomark.png?1695026131',
  explorer: 'https://nova.arbiscan.io',
  explorerAddressLink: 'https://nova.arbiscan.io/address/',
  explorerTxLink: 'https://nova.arbiscan.io/tx/',
}

export const base: AssetWithNetworkName = {
  assetId: caip.baseAssetId,
  chainId: caip.baseChainId,
  name: 'Ethereum',
  networkName: 'Base',
  symbol: 'ETH',
  precision: 18,
  color: '#5C6BC0',
  networkColor: '#0052FF',
  icon: 'https://raw.githubusercontent.com/trustwallet/assets/32e51d582a890b3dd3135fe3ee7c20c2fd699a6d/blockchains/ethereum/info/logo.png',
  networkIcon:
    'https://rawcdn.githack.com/base-org/brand-kit/8984fe6e08be3058fd7cf5cd0b201f8b92b5a70e/logo/symbol/Base_Symbol_Blue.png',
  explorer: 'https://basescan.org',
  explorerAddressLink: 'https://basescan.org/address/',
  explorerTxLink: 'https://basescan.org/tx/',
}
