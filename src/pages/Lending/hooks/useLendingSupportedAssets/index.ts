import { fromAssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import { supportsThorchain } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { useIsSnapInstalled } from 'hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useWallet } from 'hooks/useWallet/useWallet'
import { walletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { ThornodePoolResponse } from 'lib/swapper/swappers/ThorchainSwapper/types'
import { poolAssetIdToAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { isSome } from 'lib/utils'
import { getThorchainAvailablePools } from 'lib/utils/thorchain'
import { selectAssetById } from 'state/slices/selectors'
import { store } from 'state/store'

const queryKey = ['lendingSupportedAssets']

export const useLendingSupportedAssets = ({ type }: { type: 'collateral' | 'borrow' }) => {
  const wallet = useWallet().state.wallet
  const isSnapInstalled = useIsSnapInstalled()

  const { data: availablePools } = useQuery({
    // Mark pools data as stale after 60 seconds to handle the case of going from halted to available and vice versa
    staleTime: 60_000,
    queryKey: ['thorchainAvailablePools'],
    queryFn: getThorchainAvailablePools,
  })

  const walletSupportChains = useMemo(
    () =>
      Object.values(KnownChainIds).filter(chainId =>
        walletSupportsChain({ chainId, wallet, isSnapInstalled }),
      ),
    [isSnapInstalled, wallet],
  )

  const selectSupportedAssets = useCallback(
    (data: ThornodePoolResponse[] | undefined) => {
      if (!data) return []
      const pools = (availablePools ?? []).filter(
        pool => type === 'borrow' || bnOrZero(pool.loan_collateral).gt(0),
      )

      const supportedAssets = pools
        .map(pool => {
          const assetId = poolAssetIdToAssetId(pool.asset)
          const chainId = assetId ? (fromAssetId(assetId).chainId as KnownChainIds) : undefined
          if (!chainId || !walletSupportChains.includes(chainId)) return undefined

          const asset = selectAssetById(store.getState(), assetId ?? '')
          return asset
        })
        .filter(isSome)

      if (type === 'borrow' && wallet && supportsThorchain(wallet)) {
        const runeAsset = selectAssetById(store.getState(), thorchainAssetId)
        if (!runeAsset) return
        supportedAssets.push(runeAsset)
      }
      return supportedAssets
    },
    [availablePools, type, wallet, walletSupportChains],
  )

  const lendingSupportedAssetsQuery = useQuery({
    staleTime: 60_000,
    queryKey,
    queryFn: () => availablePools,
    select: selectSupportedAssets,
    enabled: Boolean(availablePools?.length),
  })

  return lendingSupportedAssetsQuery
}
