import type { AssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import BigNumber from 'bignumber.js'
import { useMemo } from 'react'

import { bnOrZero } from '@/lib/bignumber/bignumber'
import { CHAINFLIP_LENDING_ASSET_IDS_BY_ASSET } from '@/lib/chainflip/constants'
import type { ChainflipAssetSymbol } from '@/lib/chainflip/types'
import { reactQueries } from '@/react-queries'
import { selectAssetById } from '@/state/slices/assetsSlice/selectors'
import { useAppSelector } from '@/state/store'

const TWO_POW_128 = bnOrZero(2).pow(128)
const USD_REFERENCE_PRECISION = 6

// Volatile assets (BTC/ETH/SOL) update every ~30-60s on the CF oracle.
// Stablecoins update less frequently (~hours). 30s ≈ oracle TTL/2 for volatile assets.
const ORACLE_STALE_TIME = 30_000

const hexPriceToUsd = (hex: string, assetPrecision: number): string => {
  try {
    const raw = bnOrZero(BigInt(hex).toString()).div(TWO_POW_128)
    const precisionFactor = bnOrZero(10).pow(assetPrecision - USD_REFERENCE_PRECISION)
    return raw.times(precisionFactor).decimalPlaces(2, BigNumber.ROUND_CEIL).toFixed()
  } catch {
    return '0'
  }
}

export const useChainflipOraclePrices = () => {
  const { data: oraclePrices, isLoading } = useQuery({
    ...reactQueries.chainflipLending.oraclePrices(),
    staleTime: ORACLE_STALE_TIME,
  })

  const assetIds = useMemo(() => {
    if (!oraclePrices) return []
    return oraclePrices
      .map(entry => {
        const symbol = entry.base_asset.toUpperCase() as ChainflipAssetSymbol
        return CHAINFLIP_LENDING_ASSET_IDS_BY_ASSET[symbol]
      })
      .filter((id): id is AssetId => Boolean(id))
  }, [oraclePrices])

  const assetPrecisions = useAppSelector(state =>
    assetIds.map(id => selectAssetById(state, id)?.precision ?? 0),
  )

  const oraclePriceByAssetId = useMemo(() => {
    if (!oraclePrices) return {} as Record<AssetId, string>

    let precisionIdx = 0
    return oraclePrices.reduce<Record<AssetId, string>>(
      (acc, entry) => {
        const symbol = entry.base_asset.toUpperCase() as ChainflipAssetSymbol
        const assetId = CHAINFLIP_LENDING_ASSET_IDS_BY_ASSET[symbol]
        if (assetId) {
          acc[assetId] = hexPriceToUsd(entry.price, assetPrecisions[precisionIdx])
          precisionIdx += 1
        }
        return acc
      },
      {} as Record<AssetId, string>,
    )
  }, [oraclePrices, assetPrecisions])

  return useMemo(() => ({ oraclePriceByAssetId, isLoading }), [oraclePriceByAssetId, isLoading])
}

export const useChainflipOraclePrice = (assetId: AssetId) => {
  const { oraclePriceByAssetId, isLoading } = useChainflipOraclePrices()

  const oraclePrice = useMemo(
    () => oraclePriceByAssetId[assetId] ?? '0',
    [oraclePriceByAssetId, assetId],
  )

  return useMemo(() => ({ oraclePrice, isLoading }), [oraclePrice, isLoading])
}
