import '../loadEnv'

import type { AssetId } from '@shapeshiftoss/caip'
import fs from 'fs'
import orderBy from 'lodash/orderBy'

import { getUnfilteredAssetData } from './getUnfilteredAssetData'
import { setColors } from './setColors'
import { filterOutBlacklistedAssets } from './utils'

const generateColorMap = async () => {
  const unfilteredAssetData = await getUnfilteredAssetData()

  const filteredAssetData = filterOutBlacklistedAssets(unfilteredAssetData)
  const filteredWithColors = await setColors(filteredAssetData)
  const orderedAssetList = orderBy(filteredWithColors, 'assetId')

  const initial: Record<AssetId, string> = {}
  const colorMap = orderedAssetList.reduce((acc, asset) => {
    const { assetId, color } = asset
    if (color === '#FFFFFF') return acc
    acc[assetId] = color
    return acc
  }, initial)

  await fs.promises.writeFile(
    'scripts/generateAssetData/color-map.json',
    JSON.stringify(colorMap, null, 2),
  )
}

generateColorMap()
  .then(() => {
    console.info('done')
    process.exit(0)
  })
  .catch(err => {
    console.info(err)
    process.exit(1)
  })
