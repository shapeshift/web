import { fromAssetId } from '@shapeshiftoss/caip'
import { BaseAsset, TokenAsset } from '@shapeshiftoss/types'
import axios from 'axios'
import chunk from 'lodash/chunk'
import orderBy from 'lodash/orderBy'
import uniqBy from 'lodash/uniqBy'

import { getRenderedIdenticonBase64, IdenticonOptions } from '../../service/GenerateAssetIcon'
import { generateTrustWalletUrl } from '../../service/TrustWalletService'
import { ethereum } from '../baseAssets'
import { getFoxyToken } from './foxy'
import { getUniswapTokens } from './uniswap'
import {
  getIronBankTokens,
  getUnderlyingVaultTokens,
  getYearnVaults,
  getZapperTokens
} from './yearnVaults'

export const addTokensToEth = async (): Promise<BaseAsset> => {
  const baseAsset = ethereum
  const [ethTokens, yearnVaults, ironBankTokens, zapperTokens, underlyingTokens, foxyToken] =
    await Promise.all([
      getUniswapTokens(),
      getYearnVaults(),
      getIronBankTokens(),
      getZapperTokens(),
      getUnderlyingVaultTokens(),
      getFoxyToken()
    ])
  const tokens = [
    ...ethTokens,
    ...yearnVaults,
    ...ironBankTokens,
    ...zapperTokens,
    ...underlyingTokens,
    ...foxyToken
  ]
  const uniqueTokens = orderBy(uniqBy(tokens, 'assetId'), 'assetId') // Remove dups and order for PR readability
  const batchSize = 100 // tune this to keep rate limiting happy
  const tokenBatches = chunk(uniqueTokens, batchSize)
  let modifiedTokens: TokenAsset[] = []
  for (const [i, batch] of tokenBatches.entries()) {
    console.info(`processing batch ${i + 1} of ${tokenBatches.length}`)
    const promises = batch.map(async (token) => {
      const { chain } = fromAssetId(token.assetId)
      const { info } = generateTrustWalletUrl({ chain, tokenId: token.tokenId })
      return axios.head(info) // return promise
    })
    const result = await Promise.allSettled(promises)
    const newModifiedTokens = result.map((res, idx) => {
      const key = i * batchSize + idx
      if (res.status === 'rejected') {
        if (!uniqueTokens[key].icon) {
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
          uniqueTokens[key].icon = getRenderedIdenticonBase64(
            uniqueTokens[key].assetId,
            uniqueTokens[key].symbol.substring(0, 3),
            options
          )
        }
        return uniqueTokens[key] // token without modified icon
      } else {
        const { chain } = fromAssetId(uniqueTokens[key].assetId)
        const { icon } = generateTrustWalletUrl({ chain, tokenId: uniqueTokens[key].tokenId })
        return { ...uniqueTokens[key], icon }
      }
    })
    modifiedTokens = modifiedTokens.concat(newModifiedTokens)
  }
  const baseAssetWithTokens: BaseAsset = {
    ...baseAsset,
    // tokens: uniqueTokens
    tokens: modifiedTokens
  }
  return baseAssetWithTokens
}
