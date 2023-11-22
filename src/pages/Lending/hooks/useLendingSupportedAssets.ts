import { useQuery } from '@tanstack/react-query'
import { getConfig } from 'config'
import { useCallback } from 'react'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { ThornodePoolResponse } from 'lib/swapper/swappers/ThorchainSwapper/types'
import { poolAssetIdToAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { thorService } from 'lib/swapper/swappers/ThorchainSwapper/utils/thorService'
import { isSome } from 'lib/utils'
import { selectAssetById } from 'state/slices/selectors'
import { store } from 'state/store'

const queryKey = ['lendingSupportedAssets']

export const useLendingSupportedAssets = ({ type }: { type: 'collateral' | 'borrow' }) => {
  const selectSupportedAssets = useCallback(
    (data: ThornodePoolResponse[] | undefined) => {
      if (!data) return []
      const availablePools = data.filter(
        pool =>
          pool.status === 'Available' &&
          (type === 'borrow' || bnOrZero(pool.loan_collateral).gt(0)),
      )

      return availablePools
        .map(pool => {
          const assetId = poolAssetIdToAssetId(pool.asset)
          const asset = selectAssetById(store.getState(), assetId ?? '')
          return asset
        })
        .filter(isSome)
    },
    [type],
  )

  const lendingSupportedAssetsQuery = useQuery({
    staleTime: Infinity,
    queryKey,
    queryFn: async () => {
      const daemonUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL
      const poolResponse = await thorService.get<ThornodePoolResponse[]>(
        `${daemonUrl}/lcd/thorchain/pools`,
      )
      if (poolResponse.isOk()) {
        const allPools = poolResponse.unwrap().data

        return allPools
      }
    },
    select: selectSupportedAssets,
  })

  return lendingSupportedAssetsQuery
}
