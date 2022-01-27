import 'dotenv/config'

import { BaseAsset, ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import fs from 'fs'
import uniqBy from 'lodash/uniqBy'

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
        const [
          ethTokens,
          yearnVaults,
          ironBankTokens,
          zapperTokens,
          underlyingTokens
        ] = await Promise.all([
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
        const baseAssetWithTokens: BaseAsset = {
          ...baseAsset,
          tokens: uniqueTokens
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

generateAssetData().then(() => {
  console.info('done')
})
