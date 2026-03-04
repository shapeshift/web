import '../loadEnv'

import type { AssetId } from '@shapeshiftoss/caip'
import { mayachainAssetId, rujiAssetId, tcyAssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import type { ThornodePoolResponse } from '@shapeshiftoss/swapper'
import axios from 'axios'
import fs from 'fs'
import { isNull } from 'lodash'
import isUndefined from 'lodash/isUndefined'
import path from 'path'

import type { AssetIdPair } from './types'
import { getAssetIdPairFromPool } from './utils'

const { VITE_THORCHAIN_NODE_URL, VITE_MAYACHAIN_NODE_URL } = process.env

const axiosConfig = {
  timeout: 10000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
}

const isSome = <T>(option: T | null | undefined): option is T =>
  !isUndefined(option) && !isNull(option)

export const generateTradableAssetMap = async (
  url: string,
  nativePairs: AssetIdPair[],
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
        ...nativePairs,
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

generateTradableAssetMap(
  `${VITE_THORCHAIN_NODE_URL}/thorchain/pools`,
  [
    ['THOR.RUNE', thorchainAssetId],
    ['THOR.TCY', tcyAssetId],
    ['THOR.RUJI', rujiAssetId],
  ],
  'ThorchainSwapper',
)
  .then(() => {
    console.info('done')
  })
  .catch(err => console.info(err))

generateTradableAssetMap(
  `${VITE_MAYACHAIN_NODE_URL}/mayachain/pools`,
  [['MAYA.CACAO', mayachainAssetId]],
  'MayachainSwapper',
)
  .then(() => {
    console.info('done')
  })
  .catch(err => console.info(err))
