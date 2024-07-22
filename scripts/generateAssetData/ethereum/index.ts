import { ethChainId, toAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import axios from 'axios'
import chunk from 'lodash/chunk'
import orderBy from 'lodash/orderBy'
import uniqBy from 'lodash/uniqBy'

import { ethereum } from '../baseAssets'
import * as coingecko from '../coingecko'
import type { IdenticonOptions } from '../generateAssetIcon/generateAssetIcon'
import { getRenderedIdenticonBase64 } from '../generateAssetIcon/generateAssetIcon'
import { generateTrustWalletUrl } from '../generateTrustWalletUrl/generateTrustWalletUrl'
import { getPortalTokens } from '../utils/portals'
import { getIdleTokens } from './idleVaults'
import { getUniswapV2Pools } from './uniswapV2Pools'

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
}

export const getAssets = async (): Promise<Asset[]> => {
  const [ethTokens, uniV2PoolTokens, idleTokens, portalsAssets] = await Promise.all([
    coingecko.getAssets(ethChainId),
    getUniswapV2Pools(),
    getIdleTokens(),
    getPortalTokens(ethereum),
  ])

  const ethAssets = [...idleTokens, foxyToken, ...ethTokens, ...uniV2PoolTokens, ...portalsAssets]

  const uniqueAssets = orderBy(uniqBy(ethAssets, 'assetId'), 'assetId')
  const batchSize = 100
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
        if (!uniqueAssets[key].icon) {
          const options: IdenticonOptions = {
            identiconImage: {
              size: 128,
              background: [45, 55, 72, 255],
            },
            identiconText: {
              symbolScale: 7,
              enableShadow: true,
            },
          }
          uniqueAssets[key].icon = getRenderedIdenticonBase64(
            uniqueAssets[key].assetId,
            uniqueAssets[key].symbol.substring(0, 3),
            options,
          )
        }
        return uniqueAssets[key] // token without modified icon
      } else {
        const { icon } = generateTrustWalletUrl(uniqueAssets[key].assetId)
        return { ...uniqueAssets[key], icon }
      }
    })
    modifiedAssets = modifiedAssets.concat(newModifiedTokens)
  }

  return [ethereum, ...modifiedAssets]
}
