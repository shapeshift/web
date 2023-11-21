import { useMemo } from 'react'
import { FaGift } from 'react-icons/fa'
import { RawText } from 'components/Text'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectQuoteDonationAmountUsd } from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

import { StepperStep } from './StepperStep'

export type DonationStepProps = {
  isLastStep?: boolean
}

export const DonationStep = ({ isLastStep }: DonationStepProps) => {
  const {
    number: { toFiat },
  } = useLocaleFormatter()
  const donationAmountUsd = useAppSelector(selectQuoteDonationAmountUsd)

  const stepIndicator = useMemo(() => {
    return (
      <RawText color='text.success'>
        <FaGift />
      </RawText>
    )
  }, [])

  const shouldRenderDonation = useMemo(() => bnOrZero(donationAmountUsd).gt(0), [donationAmountUsd])
  const donationAmountFiatFormatted = useMemo(
    () => toFiat(donationAmountUsd),
    [donationAmountUsd, toFiat],
  )

  if (!shouldRenderDonation) return null

  return (
    <StepperStep
      title={donationAmountFiatFormatted}
      description='ShapeShift Donation'
      stepIndicator={stepIndicator}
      isActive={false}
      isLastStep={isLastStep}
    />
  )
}
