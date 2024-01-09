import { QuestionIcon } from '@chakra-ui/icons'
import { type BoxProps, Circle, Flex } from '@chakra-ui/layout'
import { useCallback, useMemo, useState } from 'react'
import { RiMoneyDollarCircleFill } from 'react-icons/ri'
import { useTranslate } from 'react-polyglot'
import { RawText } from 'components/Text'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { calculateShapeShiftFee } from 'lib/fees/utils'
import {
  selectActiveQuoteAffiliateBps,
  selectActiveQuotePotentialAffiliateBps,
  selectPotentialAffiliateFeeAmountUserCurrency,
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
  const amountAfterDiscountUserCurrency = useAppSelector(selectQuoteAffiliateFeeUserCurrency)
  const amountBeforeDiscountUserCurrency = useAppSelector(
    selectPotentialAffiliateFeeAmountUserCurrency,
  )
  const potentialAffiliateBps = useAppSelector(selectActiveQuotePotentialAffiliateBps)
  const affiliateBps = useAppSelector(selectActiveQuoteAffiliateBps)

  const handleOpenFeeModal = useCallback(() => setShowFeeModal(true), [])
  const handleCloseFeeModal = useCallback(() => setShowFeeModal(false), [])

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
      <Circle color='text.success'>
        <RiMoneyDollarCircleFill size={24} />
      </Circle>
    )
  }, [])

  const { title, titleProps } = useMemo(() => {
    return shapeShiftFee && shapeShiftFee.amountAfterDiscountUserCurrency !== '0'
      ? { title: toFiat(shapeShiftFee.amountAfterDiscountUserCurrency) }
      : { title: translate('trade.free'), titleProps: { color: 'text.success' } }
  }, [shapeShiftFee, toFiat, translate])

  const description = useMemo(() => {
    return (
      <Flex alignItems='center' gap={2}>
        <RawText>
          {`${translate('trade.tradeFeeSource', { tradeFeeSource: 'ShapeShift' })} (${
            shapeShiftFee.affiliateBps
          } bps)`}
        </RawText>
        <QuestionIcon />
      </Flex>
    )
  }, [shapeShiftFee.affiliateBps, translate])

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
      <FeeModal isOpen={showFeeModal} onClose={handleCloseFeeModal} shapeShiftFee={shapeShiftFee} />
    </>
  )
}
