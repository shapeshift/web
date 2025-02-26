import * as caip from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'

export const ethereum: Readonly<Asset> = Object.freeze({
  assetId: caip.ethAssetId,
  chainId: caip.ethChainId,
  symbol: 'ETH',
  name: 'Ethereum',
  networkName: 'Ethereum',
  precision: 18,
  color: '#5C6BC0',
  icon: 'https://rawcdn.githack.com/trustwallet/assets/32e51d582a890b3dd3135fe3ee7c20c2fd699a6d/blockchains/ethereum/info/logo.png',
  explorer: 'https://etherscan.io',
  explorerAddressLink: 'https://etherscan.io/address/',
  explorerTxLink: 'https://etherscan.io/tx/',
  relatedAssetKey: 'eip155:1/slip44:60',
})

export const bitcoin: Readonly<Asset> = Object.freeze({
  assetId: caip.btcAssetId,
  chainId: caip.btcChainId,
  symbol: 'BTC',
  name: 'Bitcoin',
  networkName: 'Bitcoin',
  precision: 8,
  color: '#FF9800',
  icon: 'https://rawcdn.githack.com/trustwallet/assets/b7a5f12d893fcf58e0eb1dd64478f076857b720b/blockchains/bitcoin/info/logo.png',
  explorer: 'https://live.blockcypher.com',
  explorerAddressLink: 'https://live.blockcypher.com/btc/address/',
  explorerTxLink: 'https://live.blockcypher.com/btc/tx/',
  relatedAssetKey: null,
})

export const bitcoincash: Readonly<Asset> = Object.freeze({
  assetId: caip.bchAssetId,
  chainId: caip.bchChainId,
  symbol: 'BCH',
  name: 'Bitcoin Cash',
  networkName: 'Bitcoin Cash',
  precision: 8,
  color: '#8BC34A',
  icon: 'https://rawcdn.githack.com/trustwallet/assets/b7a5f12d893fcf58e0eb1dd64478f076857b720b/blockchains/bitcoincash/info/logo.png',
  explorer: 'https://blockchair.com',
  explorerAddressLink: 'https://blockchair.com/bitcoin-cash/address/',
  explorerTxLink: 'https://blockchair.com/bitcoin-cash/transaction/',
  relatedAssetKey: null,
})

export const dogecoin: Readonly<Asset> = Object.freeze({
  assetId: caip.dogeAssetId,
  chainId: caip.dogeChainId,
  symbol: 'DOGE',
  name: 'Dogecoin',
  networkName: 'Dogecoin',
  precision: 8,
  color: '#FFC107',
  icon: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png?1696501409',
  explorer: 'https://live.blockcypher.com',
  explorerAddressLink: 'https://live.blockcypher.com/doge/address/',
  explorerTxLink: 'https://live.blockcypher.com/doge/tx/',
  relatedAssetKey: null,
})

export const litecoin: Readonly<Asset> = Object.freeze({
  assetId: caip.ltcAssetId,
  chainId: caip.ltcChainId,
  symbol: 'LTC',
  name: 'Litecoin',
  networkName: 'Litecoin',
  precision: 8,
  color: '#B8B8B8',
  icon: 'https://rawcdn.githack.com/trustwallet/assets/32e51d582a890b3dd3135fe3ee7c20c2fd699a6d/blockchains/litecoin/info/logo.png',
  explorer: 'https://live.blockcypher.com',
  explorerAddressLink: 'https://live.blockcypher.com/ltc/address/',
  explorerTxLink: 'https://live.blockcypher.com/ltc/tx/',
  relatedAssetKey: null,
})

export const atom: Readonly<Asset> = Object.freeze({
  assetId: caip.cosmosAssetId,
  chainId: caip.cosmosChainId,
  symbol: 'ATOM',
  name: 'Cosmos',
  networkName: 'Cosmos',
  precision: 6,
  color: '#303F9F',
  icon: 'https://rawcdn.githack.com/trustwallet/assets/b7a5f12d893fcf58e0eb1dd64478f076857b720b/blockchains/cosmos/info/logo.png',
  explorer: 'https://www.mintscan.io/cosmos',
  explorerAddressLink: 'https://www.mintscan.io/cosmos/account/',
  explorerTxLink: 'https://www.mintscan.io/cosmos/txs/',
  relatedAssetKey: null,
})

export const avax: Readonly<Asset> = Object.freeze({
  assetId: caip.avalancheAssetId,
  chainId: caip.avalancheChainId,
  name: 'Avalanche',
  networkName: 'Avalanche C-Chain',
  symbol: 'AVAX',
  precision: 18,
  color: '#FFFFFF', // this will get picked up by the color generation script,
  icon: 'https://rawcdn.githack.com/trustwallet/assets/b7a5f12d893fcf58e0eb1dd64478f076857b720b/blockchains/avalanchec/info/logo.png',
  explorer: 'https://snowtrace.dev',
  explorerAddressLink: 'https://snowtrace.dev/address/',
  explorerTxLink: 'https://snowtrace.dev/tx/',
  relatedAssetKey: null,
})

export const thorchain: Readonly<Asset> = Object.freeze({
  assetId: caip.thorchainAssetId,
  chainId: caip.thorchainChainId,
  name: 'THORChain',
  networkName: 'THORChain',
  symbol: 'RUNE',
  precision: 8,
  color: '#33FF99',
  icon: 'https://rawcdn.githack.com/trustwallet/assets/32e51d582a890b3dd3135fe3ee7c20c2fd699a6d/blockchains/thorchain/info/logo.png',
  explorer: 'https://viewblock.io/thorchain',
  explorerAddressLink: 'https://viewblock.io/thorchain/address/',
  explorerTxLink: 'https://viewblock.io/thorchain/tx/',
  relatedAssetKey: null,
})

export const optimism: Readonly<Asset> = Object.freeze({
  assetId: caip.optimismAssetId,
  chainId: caip.optimismChainId,
  name: 'Ethereum',
  networkName: 'Optimism',
  symbol: 'ETH',
  precision: 18,
  color: '#5C6BC0',
  networkColor: '#FC0424',
  icon: 'https://rawcdn.githack.com/trustwallet/assets/32e51d582a890b3dd3135fe3ee7c20c2fd699a6d/blockchains/ethereum/info/logo.png',
  networkIcon: 'https://assets.coingecko.com/coins/images/25244/large/Optimism.png?1660904599',
  explorer: 'https://optimistic.etherscan.io',
  explorerAddressLink: 'https://optimistic.etherscan.io/address/',
  explorerTxLink: 'https://optimistic.etherscan.io/tx/',
  relatedAssetKey: 'eip155:1/slip44:60',
})

export const bnbsmartchain: Readonly<Asset> = Object.freeze({
  assetId: caip.bscAssetId,
  chainId: caip.bscChainId,
  name: 'BNB',
  networkName: 'BNB Smart Chain',
  symbol: 'BNB',
  precision: 18,
  color: '#F0B90B',
  icon: 'https://rawcdn.githack.com/trustwallet/assets/b7a5f12d893fcf58e0eb1dd64478f076857b720b/blockchains/binance/info/logo.png',
  explorer: 'https://bscscan.com',
  explorerAddressLink: 'https://bscscan.com/address/',
  explorerTxLink: 'https://bscscan.com/tx/',
  relatedAssetKey: null,
})

export const polygon: Readonly<Asset> = Object.freeze({
  assetId: caip.polygonAssetId,
  chainId: caip.polygonChainId,
  name: 'Polygon Ecosystem Token',
  networkName: 'Polygon',
  symbol: 'POL',
  precision: 18,
  color: '#8f00ff',
  icon: 'https://rawcdn.githack.com/trustwallet/assets/b7a5f12d893fcf58e0eb1dd64478f076857b720b/blockchains/polygon/info/logo.png',
  explorer: 'https://polygonscan.com/',
  explorerAddressLink: 'https://polygonscan.com/address/',
  explorerTxLink: 'https://polygonscan.com/tx/',
  relatedAssetKey: null,
})

export const gnosis: Readonly<Asset> = Object.freeze({
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
  relatedAssetKey: null,
})

export const arbitrum: Readonly<Asset> = Object.freeze({
  assetId: caip.arbitrumAssetId,
  chainId: caip.arbitrumChainId,
  name: 'Ethereum',
  networkName: 'Arbitrum One',
  symbol: 'ETH',
  precision: 18,
  color: '#5C6BC0',
  networkColor: '#213147',
  icon: 'https://rawcdn.githack.com/trustwallet/assets/32e51d582a890b3dd3135fe3ee7c20c2fd699a6d/blockchains/ethereum/info/logo.png',
  networkIcon:
    'https://raw.githubusercontent.com/trustwallet/assets/b7a5f12d893fcf58e0eb1dd64478f076857b720b/blockchains/arbitrum/info/logo.png',
  explorer: 'https://arbiscan.io',
  explorerAddressLink: 'https://arbiscan.io/address/',
  explorerTxLink: 'https://arbiscan.io/tx/',
  relatedAssetKey: 'eip155:1/slip44:60',
})

export const arbitrumNova: Readonly<Asset> = Object.freeze({
  assetId: caip.arbitrumNovaAssetId,
  chainId: caip.arbitrumNovaChainId,
  name: 'Ethereum',
  networkName: 'Arbitrum Nova',
  symbol: 'ETH',
  precision: 18,
  color: '#5C6BC0',
  networkColor: '#E67408',
  icon: 'https://rawcdn.githack.com/trustwallet/assets/32e51d582a890b3dd3135fe3ee7c20c2fd699a6d/blockchains/ethereum/info/logo.png',
  networkIcon:
    'https://assets.coingecko.com/asset_platforms/images/93/large/AN_logomark.png?1695026131',
  explorer: 'https://nova.arbiscan.io',
  explorerAddressLink: 'https://nova.arbiscan.io/address/',
  explorerTxLink: 'https://nova.arbiscan.io/tx/',
  relatedAssetKey: 'eip155:1/slip44:60',
})

export const base: Readonly<Asset> = Object.freeze({
  assetId: caip.baseAssetId,
  chainId: caip.baseChainId,
  name: 'Ethereum',
  networkName: 'Base',
  symbol: 'ETH',
  precision: 18,
  color: '#5C6BC0',
  networkColor: '#0052FF',
  icon: 'https://rawcdn.githack.com/trustwallet/assets/32e51d582a890b3dd3135fe3ee7c20c2fd699a6d/blockchains/ethereum/info/logo.png',
  networkIcon:
    'https://rawcdn.githack.com/base-org/brand-kit/8984fe6e08be3058fd7cf5cd0b201f8b92b5a70e/logo/symbol/Base_Symbol_Blue.png',
  explorer: 'https://basescan.org',
  explorerAddressLink: 'https://basescan.org/address/',
  explorerTxLink: 'https://basescan.org/tx/',
  relatedAssetKey: 'eip155:1/slip44:60',
})

export const solana: Readonly<Asset> = Object.freeze({
  assetId: caip.solAssetId,
  chainId: caip.solanaChainId,
  name: 'Solana',
  networkName: 'Solana',
  symbol: 'SOL',
  precision: 9,
  color: '#9971d8',
  networkColor: '#9971d8',
  icon: 'https://rawcdn.githack.com/trustwallet/assets/426526def2f327476e868ecb902c515ab17518af/blockchains/solana/info/logo.png',
  explorer: 'https://explorer.solana.com',
  explorerAddressLink: 'https://explorer.solana.com/address/',
  explorerTxLink: 'https://explorer.solana.com/tx/',
  relatedAssetKey: null,
})
