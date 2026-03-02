import type { AssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'

import { bnOrZero } from '@/lib/bignumber/bignumber'
import { CHAINFLIP_LENDING_ASSET_IDS_BY_ASSET } from '@/lib/chainflip/constants'
import type { ChainflipAssetSymbol, ChainflipChain } from '@/lib/chainflip/types'
import { useChainflipAccount } from '@/pages/ChainflipLending/hooks/useChainflipAccount'
import type { ReduxState } from '@/state/reducer'
import { selectAssetById } from '@/state/slices/assetsSlice/selectors'
import { selectMarketDataByAssetIdUserCurrency } from '@/state/slices/marketDataSlice/selectors'
import { useAppSelector } from '@/state/store'

export type ChainflipSupplyPositionWithFiat = {
  assetId: AssetId
  chain: ChainflipChain
  asset: ChainflipAssetSymbol
  totalAmountCryptoBaseUnit: string
  totalAmountCryptoPrecision: string
  availableAmountCryptoBaseUnit: string
  availableAmountCryptoPrecision: string
  totalAmountFiat: string
}

const hexToBaseUnit = (hex: string): string => {
  try {
    return BigInt(hex).toString()
  } catch {
    return '0'
  }
}

const baseUnitToPrecision = (baseUnit: string, precision: number): string =>
  bnOrZero(baseUnit).div(bnOrZero(10).pow(precision)).toFixed()

const selectPositionFiatData = (
  state: ReduxState,
  assetSymbol: ChainflipAssetSymbol,
): { assetId: AssetId | undefined; precision: number; price: string } => {
  const assetId = CHAINFLIP_LENDING_ASSET_IDS_BY_ASSET[assetSymbol]
  if (!assetId) return { assetId: undefined, precision: 0, price: '0' }

  const asset = selectAssetById(state, assetId)
  const marketData = selectMarketDataByAssetIdUserCurrency(state, assetId)

  return {
    assetId,
    precision: asset?.precision ?? 0,
    price: marketData?.price ?? '0',
  }
}

export const useChainflipSupplyPositions = () => {
  const { accountInfo, isLoading } = useChainflipAccount()

  const lendingPositions = useMemo(
    () => accountInfo?.lending_positions ?? [],
    [accountInfo?.lending_positions],
  )

  const positionFiatData = useAppSelector(state =>
    lendingPositions.map(position => selectPositionFiatData(state, position.asset)),
  )

  const supplyPositions: ChainflipSupplyPositionWithFiat[] = useMemo(() => {
    if (!lendingPositions.length) return []

    return lendingPositions.reduce<ChainflipSupplyPositionWithFiat[]>((acc, position, i) => {
      const { assetId, precision, price } = positionFiatData[i]
      if (!assetId) return acc

      const totalBaseUnit = hexToBaseUnit(position.total_amount)
      const availableBaseUnit = hexToBaseUnit(position.available_amount)
      const totalCrypto = baseUnitToPrecision(totalBaseUnit, precision)
      const availableCrypto = baseUnitToPrecision(availableBaseUnit, precision)
      const totalFiat = bnOrZero(totalCrypto).times(price).toFixed(2)

      acc.push({
        assetId,
        chain: position.chain,
        asset: position.asset,
        totalAmountCryptoBaseUnit: totalBaseUnit,
        totalAmountCryptoPrecision: totalCrypto,
        availableAmountCryptoBaseUnit: availableBaseUnit,
        availableAmountCryptoPrecision: availableCrypto,
        totalAmountFiat: totalFiat,
      })

      return acc
    }, [])
  }, [lendingPositions, positionFiatData])

  return useMemo(
    () => ({
      supplyPositions,
      isLoading,
    }),
    [supplyPositions, isLoading],
  )
}
