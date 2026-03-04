import { flowEvmChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { flowEvm, unfreeze } from '@shapeshiftoss/utils'

import * as coingecko from '../coingecko'

export const getAssets = async (): Promise<Asset[]> => {
  const assets = await coingecko.getAssets(flowEvmChainId)

  return [...assets, unfreeze(flowEvm)]
}
