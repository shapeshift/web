import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { FoxIcon } from 'components/Icons/FoxIcon'
import { RawText } from 'components/Text'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { calculateShapeShiftFee } from 'lib/fees/utils'
import {
  selectActiveQuoteAffiliateBps,
  selectActiveQuotePotentialDonationBps,
  selectPotentialDonationAmountUserCurrency,
  selectQuoteDonationAmountUserCurrency,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

import { StepperStep } from './StepperStep'

export type FeeStepProps = {
  isLastStep?: boolean
}

export const FeeStep = ({ isLastStep }: FeeStepProps) => {
  const {
    number: { toFiat },
  } = useLocaleFormatter()
  const translate = useTranslate()
  const amountAfterDiscountUserCurrency = useAppSelector(selectQuoteDonationAmountUserCurrency)
  const amountBeforeDiscountUserCurrency = useAppSelector(selectPotentialDonationAmountUserCurrency)
  const potentialAffiliateBps = useAppSelector(selectActiveQuotePotentialDonationBps)
  const affiliateBps = useAppSelector(selectActiveQuoteAffiliateBps)

  const shapeShiftFee = useMemo(
    () =>
      calculateShapeShiftFee({
        amountBeforeDiscountUserCurrency,
        amountAfterDiscountUserCurrency,
        affiliateBps,
        potentialAffiliateBps,
      }),
    [
      affiliateBps,
      amountAfterDiscountUserCurrency,
      amountBeforeDiscountUserCurrency,
      potentialAffiliateBps,
    ],
  )

  const stepIndicator = useMemo(() => {
    return (
      <RawText color='text.success'>
        <FoxIcon />
      </RawText>
    )
  }, [])

  const { title, titleProps } = useMemo(() => {
    return shapeShiftFee && shapeShiftFee.amountAfterDiscountUserCurrency !== '0'
      ? { title: toFiat(shapeShiftFee.amountAfterDiscountUserCurrency) }
      : { title: translate('trade.free'), titleProps: { color: 'text.success' } }
  }, [shapeShiftFee, toFiat, translate])

  const description = useMemo(() => {
    return `${translate('trade.tradeFeeSource', { tradeFeeSource: 'ShapeShift' })} (${
      shapeShiftFee.affiliateBps
    } bps)`
  }, [shapeShiftFee.affiliateBps, translate])

  return (
    <StepperStep
      title={title}
      description={description}
      stepIndicator={stepIndicator}
      isLastStep={isLastStep}
      titleProps={titleProps}
    />
  )
}
