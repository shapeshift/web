import axios from 'axios'
import type { ThornodePoolResponse } from 'lib/swapper/swappers/ThorchainSwapper/types'

import { getAssetIdFromPool } from '.'

const axiosConfig = {
  timeout: 10000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
}

export const generateTradableThorAssetMap = async () => {
  const thorService = axios.create(axiosConfig)
  const response = await thorService.get<ThornodePoolResponse[]>(
    'https://dev-daemon.thorchain.shapeshift.com/lcd/thorchain/pools',
  )
  switch (response.status) {
    case 200:
      const poolData = response.data
      const assetIds = poolData.map(getAssetIdFromPool).filter(Boolean)
      // todo: manually add rune
      console.log('assetIds', assetIds)
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
