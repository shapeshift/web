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
import { reactQueries } from '@/react-queries'
import type { ReduxState } from '@/state/reducer'
import { selectAssetById } from '@/state/slices/assetsSlice/selectors'
import { selectMarketDataByAssetIdUserCurrency } from '@/state/slices/marketDataSlice/selectors'
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

const selectBalanceFiatData = (
  state: ReduxState,
  asset: ChainflipAsset,
): { assetId: AssetId | undefined; precision: number; price: string } => {
  const assetId = CHAINFLIP_LENDING_ASSET_IDS_BY_ASSET[asset.asset as ChainflipAssetSymbol]
  if (!assetId) return { assetId: undefined, precision: 0, price: '0' }

  const reduxAsset = selectAssetById(state, assetId)
  const marketData = selectMarketDataByAssetIdUserCurrency(state, assetId)

  return {
    assetId,
    precision: reduxAsset?.precision ?? 0,
    price: marketData?.price ?? '0',
  }
}

export const useChainflipFreeBalances = () => {
  const { scAccount } = useChainflipLendingAccount()

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

  const balanceFiatData = useAppSelector(state =>
    safeRawBalances.map(balance => selectBalanceFiatData(state, balance.asset)),
  )

  const freeBalances: ChainflipFreeBalanceWithFiat[] = useMemo(() => {
    if (!safeRawBalances.length) return []

    return safeRawBalances.map((balance, i) => {
      const { assetId, precision, price } = balanceFiatData[i]

      const cryptoPrecision = baseUnitToPrecision(balance.balance, precision)
      const fiat = bnOrZero(cryptoPrecision).times(price).toFixed(2)

      return {
        asset: balance.asset,
        assetId,
        balanceCryptoPrecision: cryptoPrecision,
        balanceFiat: fiat,
      }
    })
  }, [safeRawBalances, balanceFiatData])

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
