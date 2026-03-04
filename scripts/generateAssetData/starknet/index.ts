import { starknetAssetId, starknetChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import axios from 'axios'
import chunk from 'lodash/chunk'
import orderBy from 'lodash/orderBy'
import uniqBy from 'lodash/uniqBy'

import * as coingecko from '../coingecko'
import { generateTrustWalletUrl } from '../generateTrustWalletUrl/generateTrustWalletUrl'

// Starknet base asset
const starknetBaseAsset: Asset = {
  assetId: starknetAssetId,
  chainId: starknetChainId,
  name: 'Starknet',
  symbol: 'STRK',
  precision: 18,
  color: '#EC796B',
  icon: 'https://assets.coingecko.com/coins/images/26433/standard/starknet.png?1696525507',
  explorer: 'https://starkscan.co',
  explorerAddressLink: 'https://starkscan.co/contract/',
  explorerTxLink: 'https://starkscan.co/tx/',
  relatedAssetKey: null,
}

export const getAssets = async (): Promise<Asset[]> => {
  const coingeckoTokens = await coingecko.getAssets(starknetChainId).catch(err => {
    console.error('Error fetching Starknet assets from CoinGecko:', err)
    return []
  })

  const uniqueAssets = orderBy(uniqBy(coingeckoTokens, 'assetId'), 'assetId')
  const batchSize = 100
  const assetBatches = chunk(uniqueAssets, batchSize)
  let modifiedAssets: Asset[] = []

  for (const [i, batch] of assetBatches.entries()) {
    console.info(`processing Starknet batch ${i + 1} of ${assetBatches.length}`)
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

  // Filter out native STRK token from CoinGecko to avoid duplicates
  // CoinGecko includes STRK as starknet:SN_MAIN/token:0x04718...
  // But we manually define it as starknetBaseAsset with slip44:9004
  // This matches the Sui pattern for deduplicating native assets
  const nativeStrkTokenPattern =
    /^starknet:SN_MAIN\/token:0x0*4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d$/i
  const tokensOnly = modifiedAssets.filter(asset => !nativeStrkTokenPattern.test(asset.assetId))

  return [starknetBaseAsset, ...tokensOnly]
}
