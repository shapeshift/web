import {
  avalancheAssetId,
  avalancheChainId,
  bscAssetId,
  bscChainId,
  ethAssetId,
  ethChainId,
  foxAssetId,
  foxOnGnosisAssetId,
  gnosisAssetId,
  gnosisChainId,
  optimismAssetId,
  optimismChainId,
  thorchainAssetId,
  thorchainChainId,
} from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'

export const BTC: Asset = {
  assetId: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
  chainId: 'bip122:000000000019d6689c085ae165831e93',
  name: 'bitcoin',
  precision: 8,
  color: '#FFFFFF',
  icon: 'https://assets.coincap.io/assets/icons/btc@2x.png',
  explorer: 'https://live.blockcypher.com',
  explorerTxLink: 'https://live.blockcypher.com/btc/tx/',
  explorerAddressLink: 'https://live.blockcypher.com/btc/address/',
  symbol: 'BTC',
}

export const WETH: Asset = {
  assetId: 'eip155:1/erc20:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  chainId: ethChainId,
  name: 'WETH',
  precision: 18,
  color: '#FFFFFF',
  icon: 'https://assets.coingecko.com/coins/images/2518/thumb/weth.png?1628852295',
  explorer: 'https://etherscan.io',
  explorerTxLink: 'https://etherscan.io/tx/',
  explorerAddressLink: 'https://etherscan.io/address/',
  symbol: 'WETH',
}

export const FOX_MAINNET: Asset = {
  assetId: foxAssetId,
  chainId: ethChainId,
  name: 'FOX',
  precision: 18,
  color: '#FFFFFF',
  icon: 'https://assets.coincap.io/assets/icons/fox@2x.png',
  explorer: 'https://etherscan.io',
  explorerTxLink: 'https://etherscan.io/tx/',
  explorerAddressLink: 'https://etherscan.io/address/',
  symbol: 'FOX',
}

export const FOX_GNOSIS: Asset = {
  assetId: foxOnGnosisAssetId,
  chainId: gnosisChainId,
  name: 'FOX',
  precision: 18,
  color: '#FFFFFF',
  icon: 'https://assets.coincap.io/assets/icons/fox@2x.png',
  explorer: 'https://gnosis.blockscout.com/',
  explorerAddressLink: 'https://gnosis.blockscout.com/address/',
  explorerTxLink: 'https://gnosis.blockscout.com/tx/',
  symbol: 'FOX',
}

export const WBTC: Asset = {
  assetId: 'eip155:1/erc20:0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
  chainId: ethChainId,
  color: '#FFFFFF',
  explorer: 'https://etherscan.io',
  explorerAddressLink: 'https://etherscan.io/address/',
  explorerTxLink: 'https://etherscan.io/tx/',
  icon: 'https://rawcdn.githack.com/trustwallet/assets/master/blockchains/ethereum/assets/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo.png',
  name: 'Wrapped Bitcoin',
  precision: 8,
  symbol: 'WBTC',
}

export const ETH: Asset = {
  assetId: ethAssetId,
  chainId: ethChainId,
  symbol: 'ETH',
  name: 'Ethereum',
  precision: 18,
  color: '#FFFFFF',
  icon: 'https://assets.coincap.io/assets/icons/eth@2x.png',
  explorer: 'https://etherscan.io',
  explorerTxLink: 'https://etherscan.io/tx/',
  explorerAddressLink: 'https://etherscan.io/address/',
}

export const UNSUPPORTED: Asset = {
  assetId: 'eip155:1/slip44:420',
  chainId: ethChainId,
  symbol: 'ETH',
  name: 'Ethereum',
  precision: 18,
  color: '#FFFFFF',
  icon: 'https://assets.coincap.io/assets/icons/eth@2x.png',
  explorer: 'https://etherscan.io',
  explorerTxLink: 'https://etherscan.io/tx/',
  explorerAddressLink: 'https://etherscan.io/address/',
}

export const USDC_MAINNET: Asset = {
  assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  chainId: ethChainId,
  symbol: 'USDC',
  name: 'USD Coin',
  precision: 6,
  color: '#2373CB',
  icon: 'https://rawcdn.githack.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
  explorer: 'https://etherscan.io',
  explorerAddressLink: 'https://etherscan.io/address/',
  explorerTxLink: 'https://etherscan.io/tx/',
}

export const USDC_GNOSIS: Asset = {
  assetId: 'eip155:100/erc20:0xddafbb505ad214d7b80b1f830fccc89b60fb7a83',
  chainId: gnosisChainId,
  symbol: 'USDC on Gnosis',
  name: 'USD Coin',
  precision: 6,
  color: '#2373CB',
  icon: 'https://rawcdn.githack.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
  explorer: 'https://gnosis.blockscout.com/',
  explorerAddressLink: 'https://gnosis.blockscout.com/address/',
  explorerTxLink: 'https://gnosis.blockscout.com/tx/',
}

export const ETH_ARBITRUM: Asset = {
  assetId: 'eip155:42161/slip44:60',
  chainId: 'eip155:42161',
  name: 'Ethereum on Arbitrum One',
  networkName: 'Arbitrum One',
  symbol: 'ETH',
  precision: 18,
  color: '#5C6BC0',
  networkColor: '#213147',
  icon: 'https://assets.coincap.io/assets/icons/256/eth.png',
  networkIcon:
    'https://assets.coingecko.com/coins/images/16547/large/photo_2023-03-29_21.47.00.jpeg?1680097630',
  explorer: 'https://arbiscan.io',
  explorerAddressLink: 'https://arbiscan.io/address/',
  explorerTxLink: 'https://arbiscan.io/tx/',
}

export const USDC_ARBITRUM: Asset = {
  assetId: 'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831',
  chainId: 'eip155:42161',
  name: 'USDC on Arbitrum One',
  precision: 6,
  color: '#2E7ACD',
  icon: 'https://assets.coingecko.com/coins/images/6319/thumb/usdc.png?1696506694',
  symbol: 'USDC',
  explorer: 'https://arbiscan.io',
  explorerAddressLink: 'https://arbiscan.io/address/',
  explorerTxLink: 'https://arbiscan.io/tx/',
}

export const AVAX: Asset = {
  assetId: avalancheAssetId,
  chainId: avalancheChainId,
  name: 'Avalanche',
  symbol: 'AVAX',
  precision: 18,
  color: '#FFFFFF',
  icon: 'https://rawcdn.githack.com/trustwallet/assets/32e51d582a890b3dd3135fe3ee7c20c2fd699a6d/blockchains/avalanchec/info/logo.png',
  explorer: 'https://snowtrace.dev',
  explorerAddressLink: 'https://snowtrace.dev/address/',
  explorerTxLink: 'https://snowtrace.dev/tx/',
}

export const OPTIMISM: Asset = {
  assetId: optimismAssetId,
  chainId: optimismChainId,
  name: 'Ethereum',
  networkName: 'Optimism',
  symbol: 'ETH',
  precision: 18,
  color: '#5C6BC0',
  networkColor: '#FC0424',
  icon: 'https://assets.coincap.io/assets/icons/256/eth.png',
  networkIcon: 'https://assets.coingecko.com/coins/images/25244/thumb/Optimism.png?1660904599',
  explorer: 'https://optimistic.etherscan.io',
  explorerAddressLink: 'https://optimistic.etherscan.io/address/',
  explorerTxLink: 'https://optimistic.etherscan.io/tx/',
}

export const BSC: Asset = {
  assetId: bscAssetId,
  chainId: bscChainId,
  name: 'BNB',
  networkName: 'BNB Smart Chain',
  symbol: 'BNB',
  precision: 18,
  color: '#F0B90B',
  icon: 'https://assets.coingecko.com/coins/images/825/thumb/bnb-icon2_2x.png?1644979850',
  explorer: 'https://bscscan.com',
  explorerAddressLink: 'https://bscscan.com/address/',
  explorerTxLink: 'https://bscscan.com/tx/',
}

export const XDAI: Asset = {
  assetId: gnosisAssetId,
  chainId: gnosisChainId,
  name: 'xDai',
  networkName: 'Gnosis Chain',
  symbol: 'xDai',
  precision: 18,
  color: '#33765c',
  icon: 'https://assets.coingecko.com/coins/images/11062/large/Identity-Primary-DarkBG.png?1638372986',
  networkIcon:
    'https://assets.coingecko.com/asset_platforms/images/11062/large/Aatar_green_white.png?1643204471',
  explorer: 'https://gnosis.blockscout.com/',
  explorerAddressLink: 'https://gnosis.blockscout.com/address/',
  explorerTxLink: 'https://gnosis.blockscout.com/tx/',
}

export const RUNE: Asset = {
  assetId: thorchainAssetId,
  chainId: thorchainChainId,
  name: 'THORChain',
  symbol: 'RUNE',
  precision: 8,
  color: '#33FF99',
  icon: 'https://assets.coincap.io/assets/icons/rune@2x.png',
  explorer: 'https://viewblock.io/thorchain',
  explorerAddressLink: 'https://viewblock.io/thorchain/address/',
  explorerTxLink: 'https://viewblock.io/thorchain/tx/',
}
