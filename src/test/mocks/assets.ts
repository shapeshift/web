import type { Asset } from '@keepkey/asset-service'
import {
  btcAssetId,
  btcChainId,
  cosmosAssetId,
  cosmosChainId,
  ethAssetId,
  ethChainId,
  foxAssetId,
  foxyAssetId,
} from '@keepkey/caip'
import merge from 'lodash/merge'

export const rune: Asset = {
  chainId: ethChainId,
  assetId: 'eip155:1/erc20:0x3155ba85d5f96b2d030a4966af206230e46849cb',
  name: 'THORChain  ERC20 ',
  precision: 18,
  color: '#FFFFFF',
  icon: 'https://assets.coingecko.com/coins/images/13677/thumb/IMG_20210123_132049_458.png?1612179252',
  explorer: 'https://etherscan.io',
  explorerTxLink: 'https://etherscan.io/tx/',
  explorerAddressLink: 'https://etherscan.io/address/',
  symbol: 'RUNE',
}

export const ethereum: Asset = {
  chainId: ethChainId,
  assetId: ethAssetId,
  symbol: 'ETH',
  name: 'Ethereum',
  precision: 18,
  color: '#FFFFFF',
  icon: 'https://assets.coincap.io/assets/icons/eth@2x.png',
  explorer: 'https://etherscan.io',
  explorerTxLink: 'https://etherscan.io/tx/',
  explorerAddressLink: 'https://etherscan.io/address/',
}

export const usdc: Asset = {
  chainId: ethChainId,
  assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  symbol: 'ETH',
  name: 'USD Coin',
  precision: 6,
  color: '#FFFFFF',
  icon: 'https://assets.coingecko.com/coins/images/12367/thumb/oF1_9R1K_400x400.jpg?1599345463',
  explorer: 'https://etherscan.io',
  explorerTxLink: 'https://etherscan.io/tx/',
  explorerAddressLink: 'https://etherscan.io/address/',
}

export const zero: Asset = {
  chainId: ethChainId,
  assetId: 'eip155:1/erc20:0xf0939011a9bb95c3b791f0cb546377ed2693a574',
  color: '#FFFFFF',
  explorer: 'https://etherscan.io',
  explorerTxLink: 'https://etherscan.io/tx/',
  explorerAddressLink: 'https://etherscan.io/address/',
  icon: 'https://assets.coingecko.com/coins/images/13706/thumb/0.exchange_%28logo%29.jpg?1617070530',
  name: '0 exchange',
  precision: 18,
  symbol: 'ZERO',
}

export const fox: Asset = {
  chainId: ethChainId,
  assetId: foxAssetId,
  color: '#FFFFFF',
  explorer: 'https://etherscan.io',
  explorerTxLink: 'https://etherscan.io/tx/',
  explorerAddressLink: 'https://etherscan.io/address/',
  icon: 'https://assets.coincap.io/assets/icons/fox@2x.png',
  name: 'Fox',
  precision: 18,
  symbol: 'FOX',
}

export const foxy: Asset = {
  chainId: ethChainId,
  assetId: foxyAssetId,
  color: '#CE3885',
  explorer: 'https://etherscan.io',
  explorerAddressLink: 'https://etherscan.io/address/',
  explorerTxLink: 'https://etherscan.io/tx/',
  icon: 'https://raw.githubusercontent.com/shapeshift/lib/main/packages/asset-service/src/generateAssetData/ethereum/icons/foxy-icon.png',
  name: 'FOX Yieldy',
  precision: 18,
  symbol: 'FOXy',
}

export const cosmos: Asset = {
  chainId: cosmosChainId,
  assetId: cosmosAssetId,
  color: '#FFFFFF',
  explorer: 'https://www.mintscan.io/cosmos',
  explorerTxLink: 'https://www.mintscan.io/cosmos/txs/',
  explorerAddressLink: 'https://www.mintscan.io/cosmos/account/',
  icon: 'https://assets.coincap.io/assets/icons/256/atom.png',
  name: 'Cosmos',
  precision: 6,
  symbol: 'ATOM',
}

export const bitcoin: Asset = {
  chainId: btcChainId,
  assetId: btcAssetId,
  name: 'bitcoin',
  precision: 8,
  color: '#FFFFFF',
  icon: 'https://assets.coincap.io/assets/icons/btc@2x.png',
  explorer: 'https://live.blockcypher.com',
  explorerTxLink: 'https://live.blockcypher.com/btc/tx/',
  explorerAddressLink: 'https://etherscan.io/address/',
  symbol: 'BTC',
}

export const mockAssetState = (obj?: Record<string, any>) =>
  merge(
    {
      byId: {
        [ethereum.assetId]: ethereum,
        [fox.assetId]: fox,
        [usdc.assetId]: usdc,
        [zero.assetId]: zero,
        [bitcoin.assetId]: bitcoin,
      },
      ids: [ethereum.assetId, fox.assetId, usdc.assetId, bitcoin.assetId],
    },
    obj,
  )
