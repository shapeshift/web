import 'dotenv/config'

import { CHAIN_REFERENCE, fromAssetId } from '@shapeshiftoss/caip'
import { Asset } from '@shapeshiftoss/types'
import fs from 'fs'
import filter from 'lodash/filter'
import orderBy from 'lodash/orderBy'

import { AssetsById } from '../service/AssetService'
import * as avalanche from './avalanche'
import { atom, bitcoin, tBitcoin } from './baseAssets'
import blacklist from './blacklist.json'
import * as ethereum from './ethereum'
import * as osmosis from './osmosis'

const generateAssetData = async () => {
  const ethAssets = await ethereum.getAssets()
  const osmosisAssets = await osmosis.getAssets()
  const avalancheAssets = await avalanche.getAssets()

  // all assets, included assets to be blacklisted
  const unfilteredAssetData: Asset[] = [
    bitcoin,
    tBitcoin,
    atom,
    ...ethAssets,
    ...osmosisAssets,
    ...avalancheAssets
  ]
  // remove blacklisted assets
  const filteredAssetData = filter(
    unfilteredAssetData,
    ({ assetId }) => !blacklist.includes(assetId)
  )

  // deterministic order so diffs are readable
  const orderedAssetList = orderBy(filteredAssetData, 'assetId')

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

  await fs.promises.writeFile(
    `./src/service/generatedAssetData.json`,
    // beautify the file for github diff.
    JSON.stringify(generatedAssetData, null, 2)
  )
}

generateAssetData()
  .then(() => {
    console.info('done')
  })
  .catch((err) => console.info(err))
