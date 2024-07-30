import { gnosisChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import uniqBy from 'lodash/uniqBy'

import { gnosis } from '../baseAssets'
import * as coingecko from '../coingecko'
import { getPortalTokens } from '../utils/portals'

export const getAssets = async (): Promise<Asset[]> => {
  const [assets, portalsAssets] = await Promise.all([
    coingecko.getAssets(gnosisChainId),
    getPortalTokens(gnosis),
  ])

  const allAssets = uniqBy(assets.concat(portalsAssets).concat([gnosis]), 'assetId')

  return allAssets
}
