import { type AssetId, fromAssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import { useCallback } from 'react'
import { reactQueries } from 'react-queries'
import { sellSupportedChainIds } from 'lib/swapper/swappers/ThorchainSwapper/constants'
import type { MidgardPoolResponse, ThorChainId } from 'lib/swapper/swappers/ThorchainSwapper/types'
import { poolAssetIdToAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { AsymSide } from 'lib/utils/thorchain/lp/types'
import { selectAssets } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export type ParsedPool = MidgardPoolResponse & {
  isAsymmetric: boolean
  asymSide: AsymSide | null
  assetId: AssetId
  name: string
  opportunityId: string
}

export const usePools = (excludeVirtualPools?: boolean) => {
  const assets = useAppSelector(selectAssets)
  const selectPools = useCallback(
    (pools: MidgardPoolResponse[]) => {
      const runeAsset = assets[thorchainAssetId]
      // We need RUNE as a base asset, if we don't, we have bigger problems
      if (!runeAsset) return []
      // TODO(gomes): handle isLoading
      if (!pools?.length) return []

      return pools.reduce((acc, pool) => {
        // We don't support this chain, so we aren't able to represent it in the app
        const assetId = poolAssetIdToAssetId(pool.asset)
        if (!assetId) return acc

        const chainId = fromAssetId(assetId).chainId as ThorChainId
        if (!sellSupportedChainIds[chainId]) return acc

        const asset = assets[assetId]
        if (!asset) return acc

        const symmetrical = {
          ...pool,
          isAsymmetric: false,
          asymSide: null,
          assetId,
          name: `${asset.symbol}/${runeAsset.symbol} LP`,
          opportunityId: `${assetId}*sym`,
        }

        if (excludeVirtualPools) {
          acc.push(symmetrical)
          return acc
        }

        const runeSym = {
          ...pool,
          isAsymmetric: true,
          asymSide: AsymSide.Rune,
          assetId,
          name: `${runeAsset.symbol} LP`,
          opportunityId: `${assetId}*${AsymSide.Rune}`,
        }

        const assetSym = {
          ...pool,
          isAsymmetric: true,
          asymSide: AsymSide.Asset,
          assetId,
          name: `${asset.symbol} LP`,
          opportunityId: `${assetId}*${AsymSide.Asset}`,
        }

        acc.push(runeSym, assetSym, symmetrical)

        return acc
      }, [] as ParsedPool[])
    },
    [assets, excludeVirtualPools],
  )
  const pools = useQuery({
    ...reactQueries.midgard.poolsData(),
    // Parses pools with 3 "positions" per pool:
    // - RUNE asym
    // - Asset asym
    // - Sym
    // This is done to represent the different type of possible deposits for a given position, but may not necessarily relate to 3 pools being displayed
    // per actual pool at view-layer depending on product specs
    select: selectPools,
  })

  return pools
}
