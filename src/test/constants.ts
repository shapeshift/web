import { ethAssetId, ethChainId, foxAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'

export const WETH: Asset = {
  chainId: ethChainId,
  assetId: 'eip155:1/erc20:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  name: 'WETH',
  precision: 18,
  color: '#FFFFFF',
  icon: 'https://assets.coingecko.com/coins/images/2518/standard/weth.png?1628852295',
  iconLarge: 'https://assets.coingecko.com/coins/images/2518/large/weth.png?1628852295',
  explorer: 'https://etherscan.io',
  explorerTxLink: 'https://etherscan.io/tx/',
  explorerAddressLink: 'https://etherscan.io/address/',
  symbol: 'WETH',
}

export const ETH: Asset = {
  chainId: ethChainId,
  assetId: ethAssetId,
  symbol: 'ETH',
  name: 'Ethereum',
  precision: 18,
  color: '#FFFFFF',
  icon: 'https://raw.githubusercontent.com/trustwallet/assets/32e51d582a890b3dd3135fe3ee7c20c2fd699a6d/blockchains/ethereum/info/logo.png',
  iconLarge:
    'https://raw.githubusercontent.com/trustwallet/assets/32e51d582a890b3dd3135fe3ee7c20c2fd699a6d/blockchains/ethereum/info/logo.png',
  explorer: 'https://etherscan.io',
  explorerTxLink: 'https://etherscan.io/tx/',
  explorerAddressLink: 'https://etherscan.io/address/',
}

export const FOX: Asset = {
  chainId: ethChainId,
  assetId: foxAssetId,
  name: 'Fox',
  precision: 18,
  color: '#FFFFFF',
  icon: 'https://coin-images.coingecko.com/coins/images/9988/standard/FOX.png?1696510025',
  iconLarge: 'https://coin-images.coingecko.com/coins/images/9988/large/FOX.png?1696510025',
  explorer: 'https://etherscan.io',
  explorerTxLink: 'https://etherscan.io/tx/',
  explorerAddressLink: 'https://etherscan.io/address/',
  symbol: 'FOX',
}
