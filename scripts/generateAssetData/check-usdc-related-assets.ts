import { baseChainId, toAssetId } from '@shapeshiftoss/caip'
import { decodeAssetData, decodeRelatedAssetIndex } from '@shapeshiftoss/utils'
import fs from 'fs'

import { ASSET_DATA_PATH, RELATED_ASSET_INDEX_PATH } from './constants'

const main = async () => {
  try {
    const encodedAssetData = JSON.parse(await fs.promises.readFile(ASSET_DATA_PATH, 'utf8'))
    const encodedRelatedAssetIndex = JSON.parse(
      await fs.promises.readFile(RELATED_ASSET_INDEX_PATH, 'utf8'),
    )

    const { assetData, sortedAssetIds } = decodeAssetData(encodedAssetData)
    const relatedAssetIndex = decodeRelatedAssetIndex(encodedRelatedAssetIndex, sortedAssetIds)

    const usdcAssetId = toAssetId({
      assetReference: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
      chainId: baseChainId,
      assetNamespace: 'erc20',
    })

    const usdcAsset = assetData[usdcAssetId]
    if (!usdcAsset) {
      console.info('USDC asset not found')
      process.exit(1)
    }

    console.info(
      relatedAssetIndex[usdcAsset.relatedAssetKey ?? ''].map(assetId => assetData[assetId].name),
    )

    process.exit(0)
  } catch (err) {
    console.info(err)
    process.exit(1)
  }
}

main()
