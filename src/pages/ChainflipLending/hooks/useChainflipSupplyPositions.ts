import type { AssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'

import { bnOrZero } from '@/lib/bignumber/bignumber'
import { CHAINFLIP_LENDING_ASSET_IDS_BY_ASSET } from '@/lib/chainflip/constants'
import type { ChainflipAssetSymbol, ChainflipChain } from '@/lib/chainflip/types'
import { useChainflipAccount } from '@/pages/ChainflipLending/hooks/useChainflipAccount'
import { useChainflipOraclePrices } from '@/pages/ChainflipLending/hooks/useChainflipOraclePrices'
import { selectAssetById } from '@/state/slices/assetsSlice/selectors'
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

export const useChainflipSupplyPositions = () => {
  const { accountInfo, isLoading } = useChainflipAccount()
  const { oraclePriceByAssetId } = useChainflipOraclePrices()

  const lendingPositions = useMemo(
    () => accountInfo?.lending_positions ?? [],
    [accountInfo?.lending_positions],
  )

  const positionAssetData = useAppSelector(state =>
    lendingPositions.map(position => {
      const assetId = CHAINFLIP_LENDING_ASSET_IDS_BY_ASSET[position.asset]
      if (!assetId) return { assetId: undefined, precision: 0 }
      const asset = selectAssetById(state, assetId)
      return { assetId, precision: asset?.precision ?? 0 }
    }),
  )

  const supplyPositions: ChainflipSupplyPositionWithFiat[] = useMemo(() => {
    if (!lendingPositions.length) return []

    return lendingPositions.reduce<ChainflipSupplyPositionWithFiat[]>((acc, position, i) => {
      const { assetId, precision } = positionAssetData[i]
      if (!assetId) return acc

      const price = oraclePriceByAssetId[assetId] ?? '0'
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
  }, [lendingPositions, positionAssetData, oraclePriceByAssetId])

  return useMemo(
    () => ({
      supplyPositions,
      isLoading,
    }),
    [supplyPositions, isLoading],
  )
}
