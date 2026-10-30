import '../loadEnv'

import type { AssetId } from '@shapeshiftoss/caip'
import fs from 'fs'
import orderBy from 'lodash/orderBy'

import { getUnfilteredAssetData } from './getUnfilteredAssetData'
import { setColors } from './setColors'
import { filterOutBlacklistedAssets } from './utils'

// Getting the colors for ~35000 assets can take around 2 hours from scratch. So we use this file to
// generate a color map so the generate asset script itself won't take so long.
const generateColorMap = async () => {
  const unfilteredAssetData = await getUnfilteredAssetData()

  // remove blacklisted assets
  const filteredAssetData = filterOutBlacklistedAssets(unfilteredAssetData)

  const filteredWithColors = await setColors(filteredAssetData)

  // deterministic order so diffs are readable
  const orderedAssetList = orderBy(filteredWithColors, 'assetId')
  const initial: Record<AssetId, string> = {}
  const colorMap = orderedAssetList.reduce((acc, asset) => {
    const { assetId, color } = asset
    // Leave white out of the color map.
    if (color === '#FFFFFF') return acc
    acc[assetId] = color
    return acc
  }, initial)

  await fs.promises.writeFile(
    // note: cwd is the root of the monorepo, *not* the script directory
    'scripts/generateAssetData/color-map.json',
    // beautify the file for github diff.
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
