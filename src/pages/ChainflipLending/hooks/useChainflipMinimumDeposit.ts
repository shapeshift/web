import type { AssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { bnOrZero } from '@/lib/bignumber/bignumber'
import { CHAINFLIP_LENDING_ASSET_BY_ASSET_ID } from '@/lib/chainflip/constants'
import { reactQueries } from '@/react-queries'
import { selectAssetById } from '@/state/slices/assetsSlice/selectors'
import { useAppSelector } from '@/state/store'

const TEN_MINUTES = 10 * 60 * 1000

export const useChainflipMinimumDeposit = (assetId: AssetId) => {
  const { data: environment } = useQuery({
    ...reactQueries.chainflipLending.environment(),
    staleTime: TEN_MINUTES,
  })

  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const cfAsset = CHAINFLIP_LENDING_ASSET_BY_ASSET_ID[assetId]

  return useMemo(() => {
    if (!environment || !cfAsset || !asset) return undefined

    const chainMinimums = environment.ingress_egress.minimum_deposit_amounts[cfAsset.chain]
    if (!chainMinimums) return undefined

    const minBaseUnit = chainMinimums[cfAsset.asset]
    if (!minBaseUnit) return undefined

    try {
      const baseUnitDecimal = BigInt(minBaseUnit).toString()
      return bnOrZero(baseUnitDecimal).div(bnOrZero(10).pow(asset.precision)).toFixed()
    } catch {
      return undefined
    }
  }, [environment, cfAsset, asset])
}
