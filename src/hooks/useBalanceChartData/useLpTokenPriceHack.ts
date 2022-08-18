import { ethAssetId } from '@shapeshiftoss/caip'
import { getLpTokenPrice as getLpTokenPriceApi } from 'features/defi/providers/fox-eth-lp/api'
import { foxEthLpAssetId } from 'features/defi/providers/fox-eth-lp/constants'
import { useEffect, useState } from 'react'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssetById, selectFeatureFlags, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

/**
 * TODO: this hook is an ugly hack,
 * and needs to be removed when defi opportunity abstractions
 * were implemented.
 * @returns lp token price
 */
export const useLpTokenPriceHack = () => {
  const [lpTokenPrice, setLpTokenPrice] = useState<string | null>(null)
  const ethMarketData = useAppSelector(state => selectMarketDataById(state, ethAssetId))
  const ethAssetPrecision = useAppSelector(state => selectAssetById(state, ethAssetId)).precision
  const lpAssetPrecision = useAppSelector(state =>
    selectAssetById(state, foxEthLpAssetId),
  ).precision
  const featureFlags = useAppSelector(selectFeatureFlags)
  useEffect(() => {
    if (
      // get price if at least one of lp or farming were on
      (featureFlags.FoxLP || featureFlags.FoxFarming) &&
      ethAssetPrecision &&
      ethMarketData.price &&
      lpAssetPrecision
    )
      getLpTokenPriceApi(ethAssetPrecision, ethMarketData.price, lpAssetPrecision).then(
        lpTokenPrice => {
          setLpTokenPrice(lpTokenPrice.toString())
        },
      )
  }, [
    ethAssetPrecision,
    ethMarketData.price,
    featureFlags.FoxFarming,
    featureFlags.FoxLP,
    lpAssetPrecision,
  ])
  return bnOrZero(lpTokenPrice).toNumber()
}
