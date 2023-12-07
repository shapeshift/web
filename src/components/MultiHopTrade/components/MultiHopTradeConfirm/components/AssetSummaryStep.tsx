import { useMemo } from 'react'
import { AssetIcon } from 'components/AssetIcon'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import type { Asset } from '@shapeshiftoss/types'
import { bn } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { selectCryptoMarketData } from 'state/slices/selectors'
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
  const {
    number: { toCrypto, toFiat },
  } = useLocaleFormatter()
  const fiatPriceByAssetId = useAppSelector(selectCryptoMarketData)

  const sellAmountCryptoPrecision = useMemo(
    () => fromBaseUnit(amountCryptoBaseUnit, asset.precision),
    [amountCryptoBaseUnit, asset.precision],
  )

  const amountCryptoFormatted = useMemo(
    () => toCrypto(sellAmountCryptoPrecision, asset.symbol),
    [sellAmountCryptoPrecision, toCrypto, asset.symbol],
  )

  const amountFiatFormatted = useMemo(() => {
    const sellAssetFiatRate = fiatPriceByAssetId[asset.assetId]?.price ?? '0'
    return toFiat(bn(sellAmountCryptoPrecision).times(sellAssetFiatRate).toString())
  }, [fiatPriceByAssetId, sellAmountCryptoPrecision, toFiat, asset.assetId])

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
      description={`${amountFiatFormatted} on ${chainName}`}
      stepIndicator={assetIcon}
      isLastStep={isLastStep}
    />
  )
}
