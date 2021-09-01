import fs from 'fs'
import { baseAssets } from './baseAssets'
import { getTokens } from './ethTokens'

const generateAssetData = async () => {
  const generatedAssetData = await Promise.all(
    baseAssets.map(async (baseAsset) => {
      if (baseAsset.chain === 'ETH') {
        const ethTokens = await getTokens()
        const baseAssetWithTokens = { ...baseAsset, tokens: ethTokens }
        return baseAssetWithTokens
      } else {
        return baseAsset
      }
    })
  )

  await fs.promises.writeFile(`generatedAssetData.json`, JSON.stringify(generatedAssetData))
}

generateAssetData().then(() => {
  console.log('done')
})
