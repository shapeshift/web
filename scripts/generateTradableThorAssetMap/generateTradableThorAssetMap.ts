import type { AssetId } from '@shapeshiftoss/caip'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import type { ThornodePoolResponse } from '@shapeshiftoss/swapper/dist/swappers/ThorchainSwapper/types'
import axios from 'axios'
import fs from 'fs'
import { isNull } from 'lodash'
import isUndefined from 'lodash/isUndefined'
import path from 'path'

import type { AssetIdPair } from '.'
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
      /*
        Native RUNE is not included in the pools list, so it needs to be manually added as a tradable asset
        https://dev.thorchain.org/thorchain-dev/concepts/querying-thorchain#displaying-available-pairs
       */
      const assetIdPairsWithRune: AssetIdPair[] = [...assetIdPairs, ['THOR.RUNE', thorchainAssetId]]
      const assetsRecord: Record<string, AssetId> = assetIdPairsWithRune.reduce(
        (accumulator, [thorchainAsset, assetId]) => {
          accumulator[thorchainAsset] = assetId
          return accumulator
        },
        {} as Record<string, AssetId>,
      )

      await fs.promises.writeFile(
        path.join(
          __dirname,
          '../../packages/swapper/src/swappers/ThorchainSwapper/generated/generatedTradableThorAssetMap.json',
        ),
        // beautify the file for github diff.
        JSON.stringify(assetsRecord, null, 2),
      )

      break
    default:
      console.error('Network error', response)
  }
}

generateTradableThorAssetMap()
  .then(() => {
    console.info('done')
  })
  .catch(err => console.info(err))
