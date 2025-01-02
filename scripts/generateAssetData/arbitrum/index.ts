import { arbitrumChainId, foxEthLpArbitrumAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import partition from 'lodash/partition'
import uniqBy from 'lodash/uniqBy'
import { getPortalTokens } from 'lib/portals/utils'

import { arbitrum } from '../baseAssets'
import * as coingecko from '../coingecko'

const foxEthLpArbitrumAsset: Asset = {
  assetId: foxEthLpArbitrumAssetId,
  chainId: arbitrumChainId,
  name: 'UniswapV2 FOX/ETH Pool',
  precision: 18,
  symbol: 'WETH/FOX',
  color: '#FFFFFF',
  icons: [
    '/fox-token-logo.png',
    'https://rawcdn.githack.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
  ],
  explorer: arbitrum.explorer,
  explorerAddressLink: arbitrum.explorerAddressLink,
  explorerTxLink: arbitrum.explorerTxLink,
  relatedAssetKey: 'eip155:1/erc20:0x470e8de2ebaef52014a47cb5e6af86884947f08c',
} as Asset

export const getAssets = async (): Promise<Asset[]> => {
  const results = await Promise.allSettled([
    coingecko.getAssets(arbitrumChainId),
    getPortalTokens(arbitrum, 'all'),
  ])
  const [assets, _portalsAssets] = results.map(result => {
    if (result.status === 'fulfilled') return result.value
    console.error(result.reason)
    return []
  })

  // Order matters here - We do a uniqBy and only keep the first of each asset using assetId as a criteria
  // portals pools *have* to be first since Coingecko may also contain the same asset, but won't be able to get the `isPool` info
  // Regular Portals assets however, should be last, as Coingecko is generally more reliable in terms of e.g names and images
  const [portalsPools, portalsAssets] = partition(_portalsAssets, 'isPool')
  const allAssets = uniqBy(
    portalsPools.concat(assets).concat(portalsAssets).concat([arbitrum, foxEthLpArbitrumAsset]),
    'assetId',
  )

  return allAssets
}
