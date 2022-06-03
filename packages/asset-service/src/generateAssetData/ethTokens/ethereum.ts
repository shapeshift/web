import { Asset } from '@shapeshiftoss/types'
import axios from 'axios'
import chunk from 'lodash/chunk'
import orderBy from 'lodash/orderBy'
import uniqBy from 'lodash/uniqBy'

import { getRenderedIdenticonBase64, IdenticonOptions } from '../../service/GenerateAssetIcon'
import { generateTrustWalletUrl } from '../../service/TrustWalletService'
import { ethereum } from '../baseAssets'
import { getFoxyToken } from './foxy'
import { getUniswapTokens } from './uniswap'
import { getUniswapV2Pools } from './uniswapV2Pools'
import {
  getIronBankTokens,
  getUnderlyingVaultTokens,
  getYearnVaults,
  getZapperTokens
} from './yearnVaults'

export const addTokensToEth = async (): Promise<Asset[]> => {
  const [
    ethTokens,
    yearnVaults,
    ironBankTokens,
    zapperTokens,
    underlyingTokens,
    foxyToken,
    uniV2Token
  ] = await Promise.all([
    getUniswapTokens(),
    getYearnVaults(),
    getIronBankTokens(),
    getZapperTokens(),
    getUnderlyingVaultTokens(),
    getFoxyToken(),
    getUniswapV2Pools()
  ])
  const ethAssets = [
    ...ethTokens,
    ...yearnVaults,
    ...ironBankTokens,
    ...zapperTokens,
    ...underlyingTokens,
    ...foxyToken,
    ...uniV2Token
  ]
  const uniqueAssets = orderBy(uniqBy(ethAssets, 'assetId'), 'assetId') // Remove dups and order for PR readability
  const batchSize = 100 // tune this to keep rate limiting happy
  const assetBatches = chunk(uniqueAssets, batchSize)
  let modifiedAssets: Asset[] = []
  for (const [i, batch] of assetBatches.entries()) {
    console.info(`processing batch ${i + 1} of ${assetBatches.length}`)
    const promises = batch.map(async ({ assetId }) => {
      const { info } = generateTrustWalletUrl(assetId)
      return axios.head(info) // return promise
    })
    const result = await Promise.allSettled(promises)
    const newModifiedTokens = result.map((res, idx) => {
      const key = i * batchSize + idx
      if (res.status === 'rejected') {
        if (!uniqueAssets[key].icon) {
          const options: IdenticonOptions = {
            identiconImage: {
              size: 128,
              background: [45, 55, 72, 255]
            },
            identiconText: {
              symbolScale: 7,
              enableShadow: true
            }
          }
          uniqueAssets[key].icon = getRenderedIdenticonBase64(
            uniqueAssets[key].assetId,
            uniqueAssets[key].symbol.substring(0, 3),
            options
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
