import { Asset } from '@shapeshiftoss/asset-service'
import {
  avalancheAssetId,
  avalancheChainId,
  ethAssetId,
  ethChainId,
  foxAssetId,
  thorchainAssetId,
  thorchainChainId,
} from '@shapeshiftoss/caip'

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

export const FOX: Asset = {
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

export const USDC: Asset = {
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

export const AVAX: Asset = {
  assetId: avalancheAssetId,
  chainId: avalancheChainId,
  name: 'Avalanche',
  symbol: 'AVAX',
  precision: 18,
  color: '#FFFFFF',
  icon: 'https://rawcdn.githack.com/trustwallet/assets/32e51d582a890b3dd3135fe3ee7c20c2fd699a6d/blockchains/avalanchec/info/logo.png',
  explorer: 'https://snowtrace.io',
  explorerAddressLink: 'https://snowtrace.io/address/',
  explorerTxLink: 'https://snowtrace.io/tx/',
}

export const RUNE: Asset = {
  assetId: thorchainAssetId,
  chainId: thorchainChainId,
  name: 'THORChain',
  symbol: 'RUNE',
  precision: 8,
  color: '#33FF99',
  icon: 'https://assets.coincap.io/assets/icons/rune@2x.png',
  explorer: 'https://v2.viewblock.io/thorchain',
  explorerAddressLink: 'https://v2.viewblock.io/thorchain/address/',
  explorerTxLink: 'https://v2.viewblock.io/thorchain/tx/',
}
