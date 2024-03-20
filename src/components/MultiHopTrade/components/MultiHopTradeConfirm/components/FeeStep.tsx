import { QuestionIcon } from '@chakra-ui/icons'
import { type BoxProps, Circle, Flex } from '@chakra-ui/layout'
import { useCallback, useMemo, useState } from 'react'
import { RiMoneyDollarCircleFill } from 'react-icons/ri'
import { useTranslate } from 'react-polyglot'
import { FeeModal } from 'components/FeeModal/FeeModal'
import { RawText } from 'components/Text'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectInputSellAmountUsd } from 'state/slices/selectors'
import {
  selectActiveQuoteAffiliateBps,
  selectCalculatedFees,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

import { StepperStep } from './StepperStep'

export type FeeStepProps = {
  isLastStep?: boolean
}

const shapeShiftFeeModalRowHover = { textDecoration: 'underline', cursor: 'pointer' }

export const FeeStep = ({ isLastStep }: FeeStepProps) => {
  const {
    number: { toFiat },
  } = useLocaleFormatter()
  const translate = useTranslate()
  const [showFeeModal, setShowFeeModal] = useState(false)

  const inputAmountUsd = useAppSelector(selectInputSellAmountUsd)
  // use the fee data from the actual quote in case it varies from the theoretical calculation
  const affiliateBps = useAppSelector(selectActiveQuoteAffiliateBps)

  const feeModel = 'SWAPPER'
  const { feeUsd: amountAfterDiscountUsd } = useAppSelector(state =>
    selectCalculatedFees(state, { feeModel, inputAmountUsd }),
  )

  const handleOpenFeeModal = useCallback(() => setShowFeeModal(true), [])
  const handleCloseFeeModal = useCallback(() => setShowFeeModal(false), [])

  const stepIndicator = useMemo(() => {
    return (
      <Circle color='text.success'>
        <RiMoneyDollarCircleFill size={24} />
      </Circle>
    )
  }, [])

  const { title, titleProps } = useMemo(() => {
    return bnOrZero(amountAfterDiscountUsd).gt(0)
      ? { title: toFiat(amountAfterDiscountUsd.toString()) }
      : { title: translate('trade.free'), titleProps: { color: 'text.success' } }
  }, [amountAfterDiscountUsd, toFiat, translate])

  const description = useMemo(() => {
    return (
      <Flex alignItems='center' gap={2}>
        <RawText>
          {`${translate('trade.tradeFeeSource', {
            tradeFeeSource: 'ShapeShift',
          })} (${affiliateBps} bps)`}
        </RawText>
        <QuestionIcon />
      </Flex>
    )
  }, [affiliateBps, translate])

  const descriptionProps: BoxProps = useMemo(
    () => ({ onClick: handleOpenFeeModal, _hover: shapeShiftFeeModalRowHover }),
    [handleOpenFeeModal],
  )

  return (
    <>
      <StepperStep
        title={title}
        description={description}
        stepIndicator={stepIndicator}
        isLastStep={isLastStep}
        titleProps={titleProps}
        descriptionProps={descriptionProps}
      />
      <FeeModal
        isOpen={showFeeModal}
        onClose={handleCloseFeeModal}
        inputAmountUsd={inputAmountUsd}
        feeModel='SWAPPER'
      />
    </>
  )
}
