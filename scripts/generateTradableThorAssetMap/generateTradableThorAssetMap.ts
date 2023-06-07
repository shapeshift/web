import type { AssetId } from '@shapeshiftoss/caip'
import axios from 'axios'
import fs from 'fs'
import { isNull } from 'lodash'
import isUndefined from 'lodash/isUndefined'
import path from 'path'
import type { ThornodePoolResponse } from 'lib/swapper/swappers/ThorchainSwapper/types'

import { getAssetIdPairFromPool } from '.'

const axiosConfig = {
  timeout: 10000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
}

const isSome = <T>(option: T | null | undefined): option is T =>
  !isUndefined(option) && !isNull(option)

export const generateTradableThorAssetMap = async () => {
  const thorService = axios.create(axiosConfig)
  const response = await thorService.get<ThornodePoolResponse[]>(
    'https://dev-daemon.thorchain.shapeshift.com/lcd/thorchain/pools',
  )
  switch (response.status) {
    case 200:
      const poolData = response.data
      const assetIdPairs = poolData.map(getAssetIdPairFromPool).filter(isSome)
      // todo: manually add rune
      const assetsRecord: Record<string, AssetId> = assetIdPairs.reduce(
        (accumulator, [thorchainAsset, assetId]) => {
          accumulator[thorchainAsset] = assetId
          return accumulator
        },
        {} as Record<string, AssetId>,
      )
      console.log('assetIds', assetsRecord)

      await fs.promises.writeFile(
        path.join(
          __dirname,
          '../../src/lib/asset-service/service/generatedTradableThorAssetMap.json',
        ),
        // beautify the file for github diff.
        JSON.stringify(assetsRecord, null, 2),
      )

      break
    default:
      console.error('xxx', response)
  }
}

generateTradableThorAssetMap()
  .then(() => {
    console.info('done')
  })
  .catch(err => console.info(err))
