import { zkSyncEraChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { unfreeze, zkSyncEra } from '@shapeshiftoss/utils'

import * as coingecko from '../coingecko'

export const getAssets = async (): Promise<Asset[]> => {
  const assets = await coingecko.getAssets(zkSyncEraChainId)

  return [...assets, unfreeze(zkSyncEra)]
}
