import type { StepProps } from '@chakra-ui/react'
import { usePrevious } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import type { JSX } from 'react'
import { useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { StepperStep } from '../TradeConfirm/StepperStep'

import { AssetIcon } from '@/components/AssetIcon'
import { RATE_CHANGED_BPS_THRESHOLD } from '@/components/Modals/RateChanged/RateChanged'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { useModal } from '@/hooks/useModal/useModal'
import { bn } from '@/lib/bignumber/bignumber'
import { fromBaseUnit } from '@/lib/math'
import {
  selectIsAssetWithoutMarketData,
  selectMarketDataUserCurrency,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export type AssetSummaryStepProps = {
  asset: Asset
  amountCryptoBaseUnit: string
  isLastStep?: boolean
  button?: JSX.Element
  stepProps?: StepProps
}

export const AssetSummaryStep = ({
  asset,
  amountCryptoBaseUnit,
  isLastStep,
  button,
  stepProps,
}: AssetSummaryStepProps) => {
  const rateChanged = useModal('rateChanged')
  const translate = useTranslate()
  const {
    number: { toCrypto, toFiat },
  } = useLocaleFormatter()
  const marketDataUserCurrency = useAppSelector(selectMarketDataUserCurrency)
  const isAssetWithoutMarketData = useAppSelector(state =>
    selectIsAssetWithoutMarketData(state, asset.assetId),
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

  const prevAmountCryptoBaseUnit = usePrevious(amountCryptoBaseUnit)

  useEffect(() => {
    if (!isLastStep) return
    if (
      !(
        amountCryptoBaseUnit &&
        prevAmountCryptoBaseUnit &&
        amountCryptoBaseUnit !== '0' &&
        prevAmountCryptoBaseUnit !== '0'
      )
    )
      return
    if (bn(amountCryptoBaseUnit).gte(prevAmountCryptoBaseUnit)) return

    // Calculate difference in basis points (1% = 100 bps)
    const bpsDiff = bn(amountCryptoBaseUnit)
      .minus(prevAmountCryptoBaseUnit)
      .div(prevAmountCryptoBaseUnit)
      .times(10000)
      .abs()

    if (bpsDiff.lt(RATE_CHANGED_BPS_THRESHOLD)) return

    rateChanged.open({ prevAmountCryptoBaseUnit })
  }, [amountCryptoBaseUnit, isLastStep, prevAmountCryptoBaseUnit, rateChanged])

  const assetIcon = useMemo(() => {
    return <AssetIcon assetId={asset.assetId} />
  }, [asset.assetId])
  return (
    <StepperStep
      title={amountCryptoFormatted}
      description={
        isAssetWithoutMarketData
          ? undefined
          : translate('trade.fiatAmountOnChain', { amountFiatFormatted, chainName })
      }
      stepIndicator={assetIcon}
      isLastStep={isLastStep}
      button={button}
      stepProps={stepProps}
    />
  )
}
