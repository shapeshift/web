import { ethChainId, toAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { ethereum, unfreeze } from '@shapeshiftoss/utils'
import axios from 'axios'
import chunk from 'lodash/chunk'
import orderBy from 'lodash/orderBy'
import partition from 'lodash/partition'
import uniqBy from 'lodash/uniqBy'

import * as coingecko from '../coingecko'
import { generateTrustWalletUrl } from '../generateTrustWalletUrl/generateTrustWalletUrl'

import { getPortalTokens } from '@/lib/portals/utils'

const foxyToken: Asset = {
  assetId: toAssetId({
    chainId: ethChainId,
    assetNamespace: 'erc20',
    assetReference: '0xDc49108ce5C57bc3408c3A5E95F3d864eC386Ed3',
  }),
  chainId: ethChainId,
  name: 'FOX Yieldy',
  precision: 18,
  color: '#CE3885',
  icon: 'https://raw.githubusercontent.com/shapeshift/lib/main/packages/asset-service/src/generateAssetData/ethereum/icons/foxy-icon.png',
  symbol: 'FOXy',
  explorer: ethereum.explorer,
  explorerAddressLink: ethereum.explorerAddressLink,
  explorerTxLink: ethereum.explorerTxLink,
  relatedAssetKey: null,
}

export const getAssets = async (): Promise<Asset[]> => {
  const results = await Promise.allSettled([
    coingecko.getAssets(ethChainId),
    getPortalTokens(ethereum, 'all'),
  ])

  const [coingeckoTokens, portalsTokens] = results.map(result => {
    if (result.status === 'fulfilled') return result.value
    console.error(result.reason)
    return []
  })

  // Order matters here - We do a uniqBy and only keep the first of each asset using assetId as a criteria
  // portals pools *have* to be first since Coingecko may also contain the same asset, but won't be able to get the `isPool` info
  // Regular Portals assets however, should be last, as Coingecko is generally more reliable in terms of e.g names and images
  const [portalsPools, portalsAssets] = partition(portalsTokens, 'isPool')

  const ethAssets = portalsPools.concat(coingeckoTokens).concat(portalsAssets).concat(foxyToken)

  const uniqueAssets = orderBy(uniqBy(ethAssets, 'assetId'), 'assetId') // Remove dups and order for PR readability
  const batchSize = 100 // tune this to keep rate limiting happy
  const assetBatches = chunk(uniqueAssets, batchSize)
  let modifiedAssets: Asset[] = []
  for (const [i, batch] of assetBatches.entries()) {
    console.info(`processing batch ${i + 1} of ${assetBatches.length}`)
    const promises = batch.map(({ assetId }) => {
      const { info } = generateTrustWalletUrl(assetId)
      return axios.head(info)
    })
    const result = await Promise.allSettled(promises)
    const newModifiedTokens = result.map((res, idx) => {
      const key = i * batchSize + idx
      if (res.status === 'rejected') {
        return uniqueAssets[key]
      } else {
        const { icon } = generateTrustWalletUrl(uniqueAssets[key].assetId)
        return { ...uniqueAssets[key], icon }
      }
    })
    modifiedAssets = modifiedAssets.concat(newModifiedTokens)
  }

  return [unfreeze(ethereum), ...modifiedAssets]
}
