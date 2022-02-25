import 'dotenv/config'

import fs from 'fs'
import orderBy from 'lodash/orderBy'

import { atom, bitcoin, tBitcoin, tEthereum } from './baseAssets'
import { getOsmosisAssets } from './cosmos/getOsmosisAssets'
import { addTokensToEth } from './ethTokens'

const generateAssetData = async () => {
  const ethereum = await addTokensToEth()
  const osmosisAssets = await getOsmosisAssets()

  const generatedAssetData = orderBy(
    [bitcoin, tBitcoin, ethereum, tEthereum, atom, ...osmosisAssets],
    'caip19'
  )

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
