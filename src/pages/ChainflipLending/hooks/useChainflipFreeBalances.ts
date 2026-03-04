import type { AssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { bnOrZero } from '@/lib/bignumber/bignumber'
import {
  CHAINFLIP_LENDING_ASSET_BY_ASSET_ID,
  CHAINFLIP_LENDING_ASSET_IDS_BY_ASSET,
} from '@/lib/chainflip/constants'
import type { ChainflipAsset, ChainflipAssetSymbol } from '@/lib/chainflip/types'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { useChainflipOraclePrices } from '@/pages/ChainflipLending/hooks/useChainflipOraclePrices'
import { reactQueries } from '@/react-queries'
import { selectAssetById } from '@/state/slices/assetsSlice/selectors'
import { useAppSelector } from '@/state/store'

const FIFTEEN_SECONDS = 15_000

const CANONICAL_CF_ASSETS = new Set(
  Object.values(CHAINFLIP_LENDING_ASSET_BY_ASSET_ID)
    .filter((cf): cf is NonNullable<typeof cf> => Boolean(cf))
    .map(cf => `${cf.chain}:${cf.asset}`),
)

export type ChainflipFreeBalanceWithFiat = {
  asset: ChainflipAsset
  assetId: AssetId | undefined
  balanceCryptoPrecision: string
  balanceFiat: string
}

const baseUnitToPrecision = (baseUnit: string, precision: number): string =>
  bnOrZero(baseUnit).div(bnOrZero(10).pow(precision)).toFixed()

export const useChainflipFreeBalances = () => {
  const { scAccount } = useChainflipLendingAccount()
  const { oraclePriceByAssetId } = useChainflipOraclePrices()

  const { data: rawBalances, isLoading } = useQuery({
    ...reactQueries.chainflipLending.freeBalances(scAccount ?? ''),
    enabled: !!scAccount,
    staleTime: FIFTEEN_SECONDS,
  })

  const safeRawBalances = useMemo(
    () =>
      (Array.isArray(rawBalances) ? rawBalances : []).filter(b =>
        CANONICAL_CF_ASSETS.has(`${b.asset.chain}:${b.asset.asset}`),
      ),
    [rawBalances],
  )

  const balanceAssetData = useAppSelector(state =>
    safeRawBalances.map(balance => {
      const assetId =
        CHAINFLIP_LENDING_ASSET_IDS_BY_ASSET[balance.asset.asset as ChainflipAssetSymbol]
      if (!assetId) return { assetId: undefined, precision: 0 }
      const asset = selectAssetById(state, assetId)
      return { assetId, precision: asset?.precision ?? 0 }
    }),
  )

  const freeBalances: ChainflipFreeBalanceWithFiat[] = useMemo(() => {
    if (!safeRawBalances.length) return []

    return safeRawBalances.map((balance, i) => {
      const { assetId, precision } = balanceAssetData[i]
      const price = assetId ? oraclePriceByAssetId[assetId] ?? '0' : '0'

      const cryptoPrecision = baseUnitToPrecision(balance.balance, precision)
      const fiat = bnOrZero(cryptoPrecision).times(price).toFixed(2)

      return {
        asset: balance.asset,
        assetId,
        balanceCryptoPrecision: cryptoPrecision,
        balanceFiat: fiat,
      }
    })
  }, [safeRawBalances, balanceAssetData, oraclePriceByAssetId])

  const totalFiat = useMemo(
    () => freeBalances.reduce((sum, b) => sum.plus(b.balanceFiat), bnOrZero(0)).toFixed(2),
    [freeBalances],
  )

  return useMemo(
    () => ({
      freeBalances,
      isLoading,
      totalFiat,
    }),
    [freeBalances, isLoading, totalFiat],
  )
}
