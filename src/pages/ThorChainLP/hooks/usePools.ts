import { type AssetId, fromAssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { getConfig } from 'config'
import { useCallback } from 'react'
import { sellSupportedChainIds } from 'lib/swapper/swappers/ThorchainSwapper/constants'
import type { MidgardPoolResponse, ThorChainId } from 'lib/swapper/swappers/ThorchainSwapper/types'
import { poolAssetIdToAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { selectAssets } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AsymSide } from './useUserLpData'

export type ParsedPool = MidgardPoolResponse & {
  isAsymmetric: boolean
  asymSide: AsymSide | null
  assetId: AssetId
  name: string
  opportunityId: string
}

export const usePools = () => {
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

        const runeSym = {
          ...pool,
          isAsymmetric: true,
          asymSide: AsymSide.Rune,
          assetId,
          name: `${runeAsset.symbol} LP`,
          opportunityId: `${assetId}*rune`,
        }

        const assetSym = {
          ...pool,
          isAsymmetric: true,
          asymSide: AsymSide.Asset,
          assetId,
          name: `${asset.symbol} LP`,
          opportunityId: `${assetId}*asset`,
        }

        const symmetrical = {
          ...pool,
          isAsymmetric: false,
          asymSide: null,
          assetId,
          name: `${asset.symbol}/${runeAsset.symbol} LP`,
          opportunityId: `${assetId}*sym`,
        }

        acc.push(runeSym, assetSym, symmetrical)

        return acc
      }, [] as ParsedPool[])
    },
    [assets],
  )
  const pools = useQuery({
    queryKey: ['thorchainPoolData'],
    queryFn: async () => {
      const { data: poolData } = await axios.get<MidgardPoolResponse[]>(
        `${getConfig().REACT_APP_MIDGARD_URL}/pools`,
      )

      return poolData
    },
    // Parses pools with 3 positions per pool:
    // - RUNE asym
    // - Asset asym
    // - Sym
    select: selectPools,
  })

  return pools
}
