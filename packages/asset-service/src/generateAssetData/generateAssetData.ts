import 'dotenv/config'

import { caip19 } from '@shapeshiftoss/caip'
import { BaseAsset, ChainTypes, NetworkTypes, TokenAsset } from '@shapeshiftoss/types'
import axios from 'axios'
import fs from 'fs'
import { chunk } from 'lodash'
import uniqBy from 'lodash/uniqBy'

import { generateTrustWalletUrl } from '../service/TrustWalletService'
import { baseAssets } from './baseAssets'
import { getTokens } from './ethTokens'
import {
  getIronBankTokens,
  getUnderlyingVaultTokens,
  getYearnVaults,
  getZapperTokens
} from './ethTokens/extendErc20'

const generateAssetData = async () => {
  const generatedAssetData = await Promise.all(
    baseAssets.map(async (baseAsset) => {
      if (baseAsset.chain === ChainTypes.Ethereum && baseAsset.network === NetworkTypes.MAINNET) {
        const [ethTokens, yearnVaults, ironBankTokens, zapperTokens, underlyingTokens] =
          await Promise.all([
            await getTokens(),
            await getYearnVaults(),
            await getIronBankTokens(),
            await getZapperTokens(),
            await getUnderlyingVaultTokens()
          ])
        const tokens = [
          ...ethTokens,
          ...yearnVaults,
          ...ironBankTokens,
          ...zapperTokens,
          ...underlyingTokens
        ]
        const uniqueTokens = uniqBy(tokens, 'caip19') // Remove dups
        const batchSize = 100 // tune this to keep rate limiting happy
        const tokenBatches = chunk(uniqueTokens, batchSize)
        let modifiedTokens: TokenAsset[] = []
        for (const [i, batch] of tokenBatches.entries()) {
          console.info(`processing batch ${i + 1} of ${tokenBatches.length}`)
          const promises = batch.map(async (token) => {
            const { chain } = caip19.fromCAIP19(token.caip19)
            const { info } = generateTrustWalletUrl({ chain, tokenId: token.tokenId })
            return axios.head(info) // return promise
          })
          const result = await Promise.allSettled(promises)
          const newModifiedTokens = result.map((res, idx) => {
            const key = i * batchSize + idx
            if (res.status === 'rejected') {
              return uniqueTokens[key] // token without modified icon
            } else {
              const { chain } = caip19.fromCAIP19(uniqueTokens[key].caip19)
              const { icon } = generateTrustWalletUrl({ chain, tokenId: uniqueTokens[key].tokenId })
              return { ...uniqueTokens[key], icon }
            }
          })
          modifiedTokens = modifiedTokens.concat(newModifiedTokens)
        }
        const baseAssetWithTokens: BaseAsset = {
          ...baseAsset,
          tokens: modifiedTokens
        }
        return baseAssetWithTokens
      } else {
        return baseAsset
      }
    })
  )

  await fs.promises.writeFile(
    `./src/service/generatedAssetData.json`,
    JSON.stringify(generatedAssetData)
  )
}

generateAssetData()
  .then(() => {
    console.info('done')
  })
  .catch((err) => console.info(err))
