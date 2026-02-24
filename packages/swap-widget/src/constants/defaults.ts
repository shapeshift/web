import { ethChainId, usdcAssetId } from '@shapeshiftoss/caip'
import { ethereum } from '@shapeshiftoss/utils'

import type { Asset } from '../types'

export const DEFAULT_SELL_ASSET: Asset = {
  assetId: ethereum.assetId,
  chainId: ethereum.chainId,
  symbol: ethereum.symbol,
  name: ethereum.name,
  precision: ethereum.precision,
  icon: ethereum.icon,
  networkName: ethereum.networkName,
  explorer: ethereum.explorer,
  explorerTxLink: ethereum.explorerTxLink,
  explorerAddressLink: ethereum.explorerAddressLink,
}

export const DEFAULT_BUY_ASSET: Asset = {
  assetId: usdcAssetId,
  chainId: ethChainId,
  symbol: 'USDC',
  name: 'USD Coin',
  precision: 6,
  icon: 'https://assets.coingecko.com/coins/images/6319/standard/usdc.png',
}

export const POLL_INTERVAL_MS = 5000
