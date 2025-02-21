import { arbitrumNovaChainId } from '@shapeshiftmonorepo/caip'
import type { Asset } from '@shapeshiftmonorepo/types'
import { arbitrumNova, unfreeze } from '@shapeshiftmonorepo/utils'

import * as coingecko from '../coingecko'

export const getAssets = async (): Promise<Asset[]> => {
  const assets = await coingecko.getAssets(arbitrumNovaChainId)

  return assets.concat([unfreeze(arbitrumNova)])
}
