import { arbitrumNovaChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { arbitrumNova } from '@shapeshiftoss/utils/src/assetData/baseAssets'

import * as coingecko from '../coingecko'

export const getAssets = async (): Promise<Asset[]> => {
  const assets = await coingecko.getAssets(arbitrumNovaChainId)

  return assets.concat([arbitrumNova])
}
