import 'dotenv/config'

import { CHAIN_REFERENCE, fromAssetId } from '@shapeshiftoss/caip'
import fs from 'fs'
import merge from 'lodash/merge'
import orderBy from 'lodash/orderBy'

import { Asset, AssetsById } from '../service/AssetService'
import * as avalanche from './avalanche'
import { atom, bitcoin, bitcoincash, dogecoin, litecoin, thorchain } from './baseAssets'
import * as ethereum from './ethereum'
import * as optimism from './optimism'
import * as osmosis from './osmosis'
import { overrideAssets } from './overrides'
import { setColors } from './setColors'
import { filterOutBlacklistedAssets } from './utils'

const generateAssetData = async () => {
  const ethAssets = await ethereum.getAssets()
  const osmosisAssets = await osmosis.getAssets()
  const avalancheAssets = await avalanche.getAssets()
  const optimismAssets = await optimism.getAssets()

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
  ]
  // remove blacklisted assets
  const filteredAssetData = filterOutBlacklistedAssets(unfilteredAssetData)

  // For coins not currently in the color map, check to see if we can generate a color from the icon
  const filteredWithColors = await setColors(filteredAssetData)

  // deterministic order so diffs are readable
  const orderedAssetList = orderBy(filteredWithColors, 'assetId')

  const ethAssetNames = ethAssets.map((asset) => asset.name)
  const avalancheAssetNames = avalancheAssets.map((asset) => asset.name)
  const optimismAssetNames = optimismAssets.map((asset) => asset.name)

  const generatedAssetData = orderedAssetList.reduce<AssetsById>((acc, asset) => {
    const { chainReference } = fromAssetId(asset.assetId)

    // mark any avalanche assets that also exist on other evm chains
    if (
      chainReference === CHAIN_REFERENCE.AvalancheCChain &&
      ethAssetNames.concat(optimismAssetNames).includes(asset.name)
    ) {
      asset.name = `${asset.name} on Avalanche`
    }

    // mark any optimism assets that also exist on other evm chains
    if (
      chainReference === CHAIN_REFERENCE.OptimismMainnet &&
      ethAssetNames.concat(avalancheAssetNames).includes(asset.name)
    ) {
      asset.name = `${asset.name} on Optimism`
    }

    acc[asset.assetId] = asset
    return acc
  }, {})

  // do this last such that manual overrides take priority
  const assetsWithOverridesApplied = Object.entries(overrideAssets).reduce<AssetsById>(
    (prev, [assetId, asset]) => {
      if (prev[assetId]) prev[assetId] = merge(prev[assetId], asset)
      return prev
    },
    generatedAssetData,
  )

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
