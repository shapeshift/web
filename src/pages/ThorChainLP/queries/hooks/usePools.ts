import { type AssetId, fromAssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import { useCallback } from 'react'
import { reactQueries } from 'react-queries'
import { bn } from 'lib/bignumber/bignumber'
import { sellSupportedChainIds } from 'lib/swapper/swappers/ThorchainSwapper/constants'
import type { MidgardPoolResponse } from 'lib/swapper/swappers/ThorchainSwapper/types'
import { poolAssetIdToAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { fromThorBaseUnit } from 'lib/utils/thorchain'
import { selectAssets, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export type Pool = MidgardPoolResponse & {
  assetId: AssetId
  name: string
  tvlFiat: string
}

export const usePools = () => {
  const assets = useAppSelector(selectAssets)
  const runeMarketData = useAppSelector(state => selectMarketDataById(state, thorchainAssetId))

  const selectPools = useCallback(
    (pools: MidgardPoolResponse[]) => {
      const runeAsset = assets[thorchainAssetId]

      // We need RUNE as a base asset, if we don't, we have bigger problems
      if (!runeAsset) return []

      // TODO(gomes): handle isLoading
      if (!pools?.length) return []

      return pools
        .reduce<Pool[]>((acc, pool) => {
          // We don't support this chain, so we aren't able to represent it in the app
          const assetId = poolAssetIdToAssetId(pool.asset)
          if (!assetId) return acc

          const chainId = fromAssetId(assetId).chainId
          if (!sellSupportedChainIds[chainId]) return acc

          const asset = assets[assetId]
          if (!asset) return acc

          const tvl = bn(pool.assetDepth).times(pool.assetPrice).plus(pool.runeDepth)

          acc.push({
            ...pool,
            assetId,
            name: `${asset.symbol}/${runeAsset.symbol}`,
            tvlFiat: fromThorBaseUnit(tvl).times(runeMarketData.price).toFixed(),
          })

          return acc
        }, [])
        .sort((a, b) => bn(b.runeDepth).comparedTo(a.runeDepth))
    },
    [assets, runeMarketData],
  )

  const pools = useQuery({
    ...reactQueries.midgard.poolsData(),
    // @lukemorales/query-key-factory only returns queryFn and queryKey - all others will be ignored in the returned object
    // 5 minutes, since this is related to pools data, not user data - we can afford to have this stale for longer
    staleTime: 60_000 * 5,
    select: selectPools,
  })

  return pools
}
