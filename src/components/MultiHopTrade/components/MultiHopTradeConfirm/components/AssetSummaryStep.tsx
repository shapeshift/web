import type { Asset } from '@shapeshiftoss/types'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { AssetIcon } from 'components/AssetIcon'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { bn } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import {
  selectIsCustomAssetWithoutMarketData,
  selectMarketDataUserCurrency,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { StepperStep } from './StepperStep'

export type AssetSummaryStepProps = {
  asset: Asset
  amountCryptoBaseUnit: string
  isLastStep?: boolean
}

export const AssetSummaryStep = ({
  asset,
  amountCryptoBaseUnit,
  isLastStep,
}: AssetSummaryStepProps) => {
  const translate = useTranslate()
  const {
    number: { toCrypto, toFiat },
  } = useLocaleFormatter()
  const marketDataUserCurrency = useAppSelector(selectMarketDataUserCurrency)
  const isCustomAssetWithoutMarketData = useAppSelector(state =>
    selectIsCustomAssetWithoutMarketData(state, asset.assetId),
  )

  const sellAmountCryptoPrecision = useMemo(
    () => fromBaseUnit(amountCryptoBaseUnit, asset.precision),
    [amountCryptoBaseUnit, asset.precision],
  )

  const amountCryptoFormatted = useMemo(
    () => toCrypto(sellAmountCryptoPrecision, asset.symbol),
    [sellAmountCryptoPrecision, toCrypto, asset.symbol],
  )

  const amountFiatFormatted = useMemo(() => {
    const sellAssetRateUserCurrency = marketDataUserCurrency[asset.assetId]?.price ?? '0'
    return toFiat(bn(sellAmountCryptoPrecision).times(sellAssetRateUserCurrency).toString())
  }, [marketDataUserCurrency, asset.assetId, toFiat, sellAmountCryptoPrecision])

  const chainName = useMemo(() => {
    const chainAdapterManager = getChainAdapterManager()
    const chainName = chainAdapterManager.get(asset.chainId)?.getDisplayName()
    return chainName
  }, [asset.chainId])

  const assetIcon = useMemo(() => {
    return <AssetIcon src={asset.icon} boxSize='32px' />
  }, [asset.icon])
  return (
    <StepperStep
      title={amountCryptoFormatted}
      description={
        isCustomAssetWithoutMarketData
          ? undefined
          : translate('trade.assetSummaryDescription', { amountFiatFormatted, chainName })
      }
      stepIndicator={assetIcon}
      isLastStep={isLastStep}
    />
  )
}
