import 'dotenv/config'

import { AssetId, CHAIN_REFERENCE, fromAssetId } from '@shapeshiftoss/caip'
import fs from 'fs'
import merge from 'lodash/merge'
import orderBy from 'lodash/orderBy'

import { Asset, AssetsById } from '../service/AssetService'
import * as avalanche from './avalanche'
import { atom, bitcoin, bitcoincash, dogecoin, litecoin, thorchain } from './baseAssets'
import * as ethereum from './ethereum'
import * as osmosis from './osmosis'
import assetOverrides from './overrides.json'
import { setColors } from './setColors'
import { filterOutBlacklistedAssets } from './utils'

export type AssetOverrides = Record<
  AssetId,
  Partial<Omit<Asset, 'assetId' | 'chainId' | 'precision'>> // fields that can't be overridden
>

const generateAssetData = async () => {
  const ethAssets = await ethereum.getAssets()
  const osmosisAssets = await osmosis.getAssets()
  const avalancheAssets = await avalanche.getAssets()

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
  ]
  // remove blacklisted assets
  const filteredAssetData = filterOutBlacklistedAssets(unfilteredAssetData)

  // For coins not currently in the color map, check to see if we can generate a color from the icon
  const filteredWithColors = await setColors(filteredAssetData)

  // deterministic order so diffs are readable
  const orderedAssetList = orderBy(filteredWithColors, 'assetId')

  const ethTokenNames = ethAssets.map((asset) => asset.name)
  const generatedAssetData = orderedAssetList.reduce<AssetsById>((acc, asset) => {
    const { chainReference } = fromAssetId(asset.assetId)

    // mark any avalanche assets that also exist on ethereum
    if (chainReference === CHAIN_REFERENCE.AvalancheCChain && ethTokenNames.includes(asset.name)) {
      asset.name = `${asset.name} on Avalanche`
    }

    acc[asset.assetId] = asset
    return acc
  }, {})

  // do this last such that manual overrides take priority
  const assetsWithOverridesApplied = merge(generatedAssetData, assetOverrides)

  await fs.promises.writeFile(
    `./src/service/generatedAssetData.json`,
    // beautify the file for github diff.
    JSON.stringify(assetsWithOverridesApplied, null, 2),
  )
}

generateAssetData()
  .then(() => {
    console.info('done')
  })
  .catch((err) => console.info(err))
