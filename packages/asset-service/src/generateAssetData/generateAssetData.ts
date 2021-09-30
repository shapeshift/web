import fs from 'fs'
import { baseAssets } from './baseAssets'
import { getTokens } from './ethTokens'
import { BaseAsset, ChainTypes, NetworkTypes } from '@shapeshiftoss/types'

const generateAssetData = async () => {
  const generatedAssetData = await Promise.all(
    baseAssets.map(async (baseAsset) => {
      if (baseAsset.chain === ChainTypes.Ethereum && baseAsset.network === NetworkTypes.MAINNET) {
        const ethTokens = await getTokens()
        const baseAssetWithTokens: BaseAsset = { ...baseAsset, tokens: ethTokens }
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
