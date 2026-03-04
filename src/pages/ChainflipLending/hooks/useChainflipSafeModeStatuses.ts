import type { AssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { CHAINFLIP_LENDING_ASSET_BY_ASSET_ID } from '@/lib/chainflip/constants'
import { reactQueries } from '@/react-queries'

const THIRTY_SECONDS = 30_000

export const useChainflipSafeModeStatuses = (assetId: AssetId) => {
  const { data, isLoading } = useQuery({
    ...reactQueries.chainflipLending.safeModeStatuses(),
    staleTime: THIRTY_SECONDS,
  })

  return useMemo(() => {
    const cfAsset = CHAINFLIP_LENDING_ASSET_BY_ASSET_ID[assetId]
    const lendingPools = data?.lending_pools
    const liquidityProvider = data?.liquidity_provider

    const includesAsset = (
      assets:
        | {
            chain: string
            asset: string
          }[]
        | undefined,
    ) => {
      if (!cfAsset || !assets) return false

      return assets.some(asset => asset.chain === cfAsset.chain && asset.asset === cfAsset.asset)
    }

    return {
      canDepositToChainflip: Boolean(liquidityProvider?.deposit_enabled),
      canWithdrawFromChainflip: Boolean(liquidityProvider?.withdrawal_enabled),
      canSupply: includesAsset(lendingPools?.add_lender_funds),
      canWithdrawSupply: includesAsset(lendingPools?.withdraw_lender_funds),
      canAddCollateral: includesAsset(lendingPools?.add_collateral),
      canRemoveCollateral: includesAsset(lendingPools?.remove_collateral),
      canBorrow: includesAsset(lendingPools?.borrowing),
      canLiquidate: Boolean(lendingPools?.liquidations_enabled),
      isLoading,
    }
  }, [assetId, data, isLoading])
}
