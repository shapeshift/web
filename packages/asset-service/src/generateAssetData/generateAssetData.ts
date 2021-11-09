import { BaseAsset, ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import fs from 'fs'

import { baseAssets } from './baseAssets'
import { getTokens } from './ethTokens'
import { extendErc20 } from './extendErc20'

const generateAssetData = async () => {
  const generatedAssetData = await Promise.all(
    baseAssets.map(async (baseAsset) => {
      if (baseAsset.chain === ChainTypes.Ethereum && baseAsset.network === NetworkTypes.MAINNET) {
        const [ethTokens, extendedERC20Tokens] = await Promise.all([
          await getTokens(),
          await extendErc20()
        ])
        const baseAssetWithTokens: BaseAsset = {
          ...baseAsset,
          tokens: ethTokens.concat(extendedERC20Tokens)
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
