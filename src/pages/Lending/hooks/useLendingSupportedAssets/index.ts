import { thorchainAssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import { useCallback } from 'react'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { ThornodePoolResponse } from 'lib/swapper/swappers/ThorchainSwapper/types'
import { poolAssetIdToAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { isSome } from 'lib/utils'
import { getThorchainAvailablePools } from 'lib/utils/thorchain'
import { selectAssetById } from 'state/slices/selectors'
import { store } from 'state/store'

const queryKey = ['lendingSupportedAssets']

export const useLendingSupportedAssets = ({ type }: { type: 'collateral' | 'borrow' }) => {
  const { data: availablePools } = useQuery({
    // Mark pools data as stale after 60 seconds to handle the case of going from halted to available and vice versa
    staleTime: 60_000,
    queryKey: ['thorchainAvailablePools'],
    queryFn: getThorchainAvailablePools,
  })

  const selectSupportedAssets = useCallback(
    (data: ThornodePoolResponse[] | undefined) => {
      if (!data) return []
      const pools = (availablePools ?? []).filter(
        pool => type === 'borrow' || bnOrZero(pool.loan_collateral).gt(0),
      )

      const supportedAssets = pools
        .map(pool => {
          const assetId = poolAssetIdToAssetId(pool.asset)
          const asset = selectAssetById(store.getState(), assetId ?? '')
          return asset
        })
        .filter(isSome)

      if (type === 'borrow') {
        const runeAsset = selectAssetById(store.getState(), thorchainAssetId)
        if (!runeAsset) return
        supportedAssets.push(runeAsset)
      }
      return supportedAssets
    },
    [availablePools, type],
  )

  const lendingSupportedAssetsQuery = useQuery({
    staleTime: 60_000,
    queryKey,
    queryFn: () => availablePools,
    select: selectSupportedAssets,
  })

  return lendingSupportedAssetsQuery
}
