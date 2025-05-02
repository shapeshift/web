import type { AssetId } from '@shapeshiftoss/caip'
import { mayachainAssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import type { ThornodePoolResponse } from '@shapeshiftoss/swapper'
import axios from 'axios'
import fs from 'fs'
import { isNull } from 'lodash'
import isUndefined from 'lodash/isUndefined'
import path from 'path'

import type { AssetIdPair } from './types'
import { getAssetIdPairFromPool } from './utils'

const axiosConfig = {
  timeout: 10000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
}

const isSome = <T>(option: T | null | undefined): option is T =>
  !isUndefined(option) && !isNull(option)

export const generateTradableThorAssetMap = async (
  url: string,
  nativePair: AssetIdPair,
  swapper: string,
) => {
  const thorService = axios.create(axiosConfig)

  const response = await thorService.get<ThornodePoolResponse[]>(url)

  switch (response.status) {
    case 200:
      const poolData = response.data

      // native asset is not included in the pools list, so it needs to be manually added as a tradable asset
      const assetIdPairs: AssetIdPair[] = [
        ...poolData.map(getAssetIdPairFromPool).filter(isSome),
        nativePair,
      ]

      const assetsRecord = assetIdPairs.reduce<Record<string, AssetId>>((acc, [asset, assetId]) => {
        acc[asset] = assetId
        return acc
      }, {})

      await fs.promises.writeFile(
        path.join(
          __dirname,
          `../../packages/swapper/src/swappers/${swapper}/generated/generatedTradableAssetMap.json`,
        ),
        // beautify the file for github diff.
        JSON.stringify(assetsRecord, null, 2),
      )

      break
    default:
      console.error('Network error', response)
  }
}

generateTradableThorAssetMap(
  'https://daemon.thorchain.shapeshift.com/lcd/thorchain/pools',
  ['THOR.RUNE', thorchainAssetId],
  'ThorchainSwapper',
)
  .then(() => {
    console.info('done')
  })
  .catch(err => console.info(err))

generateTradableThorAssetMap(
  'https://daemon.mayachain.shapeshift.com/lcd/mayachain/pools',
  ['MAYA.CACAO', mayachainAssetId],
  'MayachainSwapper',
)
  .then(() => {
    console.info('done')
  })
  .catch(err => console.info(err))
