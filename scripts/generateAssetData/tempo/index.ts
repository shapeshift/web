import { tempoChainId, tempoUsdcAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { tempo, unfreeze } from '@shapeshiftoss/utils'

import * as coingecko from '../coingecko'

const tempoUsdc: Asset = {
  assetId: tempoUsdcAssetId,
  chainId: tempoChainId,
  name: 'USD Coin',
  networkName: 'Tempo',
  symbol: 'USDC',
  precision: 6,
  color: '#2775CA',
  networkColor: '#22C55E',
  icon: 'https://assets.coingecko.com/coins/images/6319/large/usdc.png?1696506694',
  networkIcon: 'https://assets.relay.link/icons/4217/light.png',
  explorer: 'https://explore.tempo.xyz',
  explorerAddressLink: 'https://explore.tempo.xyz/address/',
  explorerTxLink: 'https://explore.tempo.xyz/receipt/',
  relatedAssetKey: null,
}

export const getAssets = async (): Promise<Asset[]> => {
  const assets = await coingecko.getAssets(tempoChainId)

  // CoinGecko currently exposes pathUSD on Tempo, but not Tempo USDC directly.
  // We inject Tempo USDC manually and relate it back to canonical Ethereum USDC.
  return [...assets, unfreeze(tempo), tempoUsdc]
}
