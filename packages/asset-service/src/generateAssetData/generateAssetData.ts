import 'dotenv/config'

import fs from 'fs'
import orderBy from 'lodash/orderBy'

import { atom, bitcoin, tBitcoin, tEthereum } from './baseAssets'
import blacklist from './blacklist.json'
import { getOsmosisAssets } from './cosmos/getOsmosisAssets'
import { addTokensToEth } from './ethTokens'
import { filterBlacklistedAssets } from './utils'

const generateAssetData = async () => {
  const ethereum = await addTokensToEth()
  const osmosisAssets = await getOsmosisAssets()

  // all assets, included assets to be blacklisted
  const unfilteredAssetData = [bitcoin, tBitcoin, ethereum, tEthereum, atom, ...osmosisAssets]
  // remove blacklisted assets
  const filteredAssetData = filterBlacklistedAssets(blacklist, unfilteredAssetData)
  // deterministic order so diffs are readable
  const generatedAssetData = orderBy(filteredAssetData, 'assetId')

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
