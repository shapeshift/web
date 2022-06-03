import 'dotenv/config'

import { AssetId } from '@shapeshiftoss/caip'
import { Asset } from '@shapeshiftoss/types'
import fs from 'fs'
import filter from 'lodash/filter'
import orderBy from 'lodash/orderBy'

import { AssetsById } from '../service/AssetService'
import { atom, bitcoin, tBitcoin } from './baseAssets'
import blacklist from './blacklist.json'
import { getOsmosisAssets } from './cosmos/getOsmosisAssets'
import { addTokensToEth } from './ethTokens'

const generateAssetData = async () => {
  const ethAssets = await addTokensToEth()
  const osmosisAssets = await getOsmosisAssets()

  // all assets, included assets to be blacklisted
  const unfilteredAssetData: Asset[] = [bitcoin, tBitcoin, ...ethAssets, atom, ...osmosisAssets]
  // remove blacklisted assets
  const filteredAssetData = filter(
    unfilteredAssetData,
    ({ assetId }) => !blacklist.includes(assetId)
  )

  // deterministic order so diffs are readable
  const orderedAssetList = orderBy(filteredAssetData, 'assetId')
  const initial: Record<AssetId, Asset> = {}
  const generatedAssetData: AssetsById = orderedAssetList.reduce((acc, asset) => {
    const { assetId } = asset
    acc[assetId] = asset
    return acc
  }, initial)

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
