import 'dotenv/config'

import type { AssetId } from '@shapeshiftoss/caip'
import fs from 'fs'
import orderBy from 'lodash/orderBy'
import type { Asset } from 'lib/asset-service'

import * as avalanche from './avalanche'
import { atom, bitcoin, bitcoincash, dogecoin, litecoin, thorchain } from './baseAssets'
import * as bnbsmartchain from './bnbsmartchain'
import * as ethereum from './ethereum'
import * as gnosis from './gnosis'
import * as optimism from './optimism'
import * as osmosis from './osmosis'
import * as polygon from './polygon'
import { setColors } from './setColors'
import { filterOutBlacklistedAssets } from './utils'

// Getting the colors for ~6000 assets can take around 20 min from scratch. So we use this file to
// generate a color map so the generate asset script itself won't take so long.
const generateColorMap = async () => {
  const ethAssets = await ethereum.getAssets()
  const osmosisAssets = await osmosis.getAssets()
  const avalancheAssets = await avalanche.getAssets()
  const optimismAssets = await optimism.getAssets()
  const bnbsmartchainAssets = await bnbsmartchain.getAssets()
  const polygonAssets = await polygon.getAssets()
  const gnosisAssets = await gnosis.getAssets()

  // all assets, included assets to be blacklisted
  const unfilteredAssetData: Asset[] = [
    bitcoin,
    bitcoincash,
    dogecoin,
    litecoin,
    atom,
    thorchain,
    ...ethAssets,
    ...osmosisAssets,
    ...avalancheAssets,
    ...optimismAssets,
    ...bnbsmartchainAssets,
    ...polygonAssets,
    ...gnosisAssets,
  ]
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
    `./scripts/generateAssetData/colorMap/color-map.json`,
    // beautify the file for github diff.
    JSON.stringify(colorMap, null, 2),
  )
}

generateColorMap()
  .then(() => {
    console.info('done')
  })
  .catch(err => console.info(err))
