import { caip2, CAIP19, caip19 } from '@shapeshiftoss/caip'
import { HDWallet, supportsBTC, supportsCosmos, supportsETH } from '@shapeshiftoss/hdwallet-core'
import { matchSorter } from 'match-sorter'
import { btcChainId, cosmosChainId, ethChainId } from 'state/slices/portfolioSlice/utils'

import { FiatRampAsset } from './FiatRampsCommon'

export const middleEllipsis = (address: string, cut: number) =>
  `${address.slice(0, cut)}...${address.slice(-1 * cut)}`

export const isSupportedAsset = (assetId: CAIP19, wallet: HDWallet): boolean => {
  if (!assetId) return false
  const { chain, network } = caip19.fromCAIP19(assetId)
  const chainId = caip2.toCAIP2({ chain, network })
  switch (chainId) {
    case ethChainId:
      return supportsETH(wallet)
    case btcChainId:
      return supportsBTC(wallet)
    case cosmosChainId:
      return supportsCosmos(wallet)
    default:
      return false
  }
}

export const filterAssetsBySearchTerm = (search: string, assets: FiatRampAsset[]) =>
  matchSorter(assets, search, { keys: ['symbol', 'name'] })
