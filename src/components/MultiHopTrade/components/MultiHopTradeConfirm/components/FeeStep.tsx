import { QuestionIcon } from '@chakra-ui/icons'
import { type BoxProps, Circle, Flex } from '@chakra-ui/layout'
import { useCallback, useMemo, useState } from 'react'
import { RiMoneyDollarCircleFill } from 'react-icons/ri'
import { useTranslate } from 'react-polyglot'
import { RawText } from 'components/Text'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import {
  selectActiveQuoteAffiliateBps,
  selectQuoteAffiliateFeeUserCurrency,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

import { FeeModal } from '../../FeeModal/FeeModal'
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

  // use the fee data from the actual quote in case it varies from the theoretical calculation
  const affiliateBps = useAppSelector(selectActiveQuoteAffiliateBps)
  const amountAfterDiscountUserCurrency = useAppSelector(selectQuoteAffiliateFeeUserCurrency)

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
    return amountAfterDiscountUserCurrency !== '0'
      ? { title: toFiat(amountAfterDiscountUserCurrency) }
      : { title: translate('trade.free'), titleProps: { color: 'text.success' } }
  }, [amountAfterDiscountUserCurrency, toFiat, translate])

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
      <FeeModal isOpen={showFeeModal} onClose={handleCloseFeeModal} />
    </>
  )
}
