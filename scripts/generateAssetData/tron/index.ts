import { tronChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { tron, unfreeze } from '@shapeshiftoss/utils'
import axios from 'axios'
import chunk from 'lodash/chunk'
import orderBy from 'lodash/orderBy'
import uniqBy from 'lodash/uniqBy'

import * as coingecko from '../coingecko'
import { generateTrustWalletUrl } from '../generateTrustWalletUrl/generateTrustWalletUrl'

export const getAssets = async (): Promise<Asset[]> => {
  const coingeckoTokens = await coingecko.getAssets(tronChainId).catch(err => {
    console.error('Error fetching TRON assets from CoinGecko:', err)
    return []
  })

  const uniqueAssets = orderBy(uniqBy(coingeckoTokens, 'assetId'), 'assetId')
  const batchSize = 100
  const assetBatches = chunk(uniqueAssets, batchSize)
  let modifiedAssets: Asset[] = []

  for (const [i, batch] of assetBatches.entries()) {
    console.info(`processing TRON batch ${i + 1} of ${assetBatches.length}`)
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

  return [unfreeze(tron), ...modifiedAssets]
}
