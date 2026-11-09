import { elysiumChainId, toAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { elysium, unfreeze } from '@shapeshiftoss/utils'
import uniqBy from 'lodash/uniqBy'

import * as coingecko from '../coingecko'

const whypeToken: Asset = {
  assetId: toAssetId({
    chainId: elysiumChainId,
    assetNamespace: 'erc20',
    assetReference: '0xbA876237B0F021A6c6D852d6c26E107997cC5E81',
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
    assetReference: '0xb47c4C8F73F009CC0C0d3f92B388d13E293F0B65',
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
