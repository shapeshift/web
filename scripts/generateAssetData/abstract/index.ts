import { abstractChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { abstract, unfreeze } from '@shapeshiftoss/utils'

import * as coingecko from '../coingecko'

export const getAssets = async (): Promise<Asset[]> => {
  const assets = await coingecko.getAssets(abstractChainId)

  return [...assets, unfreeze(abstract)]
}
