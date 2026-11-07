import { elysiumChainId, toAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { elysium, unfreeze } from '@shapeshiftoss/utils'
import uniqBy from 'lodash/uniqBy'

import * as coingecko from '../coingecko'

const whypeToken: Asset = {
  assetId: toAssetId({
    chainId: elysiumChainId,
    assetNamespace: 'erc20',
    assetReference: '0xCD57F65c2B0e5881CFC2E609F7CD53b746E1F234',
  }),
  chainId: elysiumChainId,
  name: 'WHYPE',
  precision: 18,
  color: '#DDFBF4',
  icon: 'https://assets.coingecko.com/coins/images/54469/large/_UP3jBsi_400x400.jpg?1739905920',
  symbol: 'WHYPE',
  explorer: elysium.explorer,
  explorerAddressLink: elysium.explorerAddressLink,
  explorerTxLink: elysium.explorerTxLink,
  relatedAssetKey: null,
}

const usdcToken: Asset = {
  assetId: toAssetId({
    chainId: elysiumChainId,
    assetNamespace: 'erc20',
    assetReference: '0x7D29d8047B905000459c0E80c34a26CeedcB47b2',
  }),
  chainId: elysiumChainId,
  name: 'USDC',
  precision: 6,
  color: '#2373CB',
  icon: 'https://assets.coingecko.com/coins/images/6319/large/USDC.png?1769615602',
  symbol: 'USDC',
  explorer: elysium.explorer,
  explorerAddressLink: elysium.explorerAddressLink,
  explorerTxLink: elysium.explorerTxLink,
  relatedAssetKey: null,
}

export const getAssets = async (): Promise<Asset[]> => {
  const assets = await coingecko.getAssets(elysiumChainId)

  return uniqBy([...assets, unfreeze(elysium), whypeToken, usdcToken], 'assetId')
}
