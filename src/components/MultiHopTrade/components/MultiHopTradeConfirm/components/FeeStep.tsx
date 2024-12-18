import { QuestionIcon } from '@chakra-ui/icons'
import type { BoxProps } from '@chakra-ui/layout'
import { Circle, Flex } from '@chakra-ui/layout'
import { useCallback, useMemo, useState } from 'react'
import { RiMoneyDollarCircleFill } from 'react-icons/ri'
import { useTranslate } from 'react-polyglot'
import { FeeModal } from 'components/FeeModal/FeeModal'
import { RawText } from 'components/Text'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { THORSWAP_MAXIMUM_YEAR_TRESHOLD, THORSWAP_UNIT_THRESHOLD } from 'lib/fees/model'
import { selectThorVotingPower } from 'state/apis/snapshot/selectors'
import { selectInputSellAmountUsd } from 'state/slices/tradeInputSlice/selectors'
import {
  selectActiveQuoteAffiliateBps,
  selectTradeQuoteAffiliateFeeAfterDiscountUserCurrency,
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
  const thorVotingPower = useAppSelector(selectThorVotingPower)

  const isThorFreeTrade = useMemo(
    () =>
      bnOrZero(thorVotingPower).toNumber() >= THORSWAP_UNIT_THRESHOLD &&
      new Date().getUTCFullYear() < THORSWAP_MAXIMUM_YEAR_TRESHOLD,
    [thorVotingPower],
  )

  const inputAmountUsd = useAppSelector(selectInputSellAmountUsd)
  // use the fee data from the actual quote in case it varies from the theoretical calculation
  const affiliateBps = useAppSelector(selectActiveQuoteAffiliateBps)

  const affiliateFeeAfterDiscountUserCurrency = useAppSelector(
    selectTradeQuoteAffiliateFeeAfterDiscountUserCurrency,
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
    return bnOrZero(affiliateFeeAfterDiscountUserCurrency).gt(0)
      ? { title: toFiat(bnOrZero(affiliateFeeAfterDiscountUserCurrency).toFixed()) }
      : { title: translate('trade.free'), titleProps: { color: 'text.success' } }
  }, [affiliateFeeAfterDiscountUserCurrency, toFiat, translate])

  const description = useMemo(() => {
    return (
      <Flex alignItems='center' gap={2}>
        <RawText>
          {`${translate('trade.tradeFeeSource', {
            tradeFeeSource: 'ShapeShift',
          })} (${affiliateBps} bps)`}
        </RawText>
        {!isThorFreeTrade && <QuestionIcon />}
      </Flex>
    )
  }, [affiliateBps, translate, isThorFreeTrade])

  const descriptionProps: BoxProps = useMemo(
    () => ({
      onClick: !isThorFreeTrade ? handleOpenFeeModal : undefined,
      _hover: !isThorFreeTrade ? shapeShiftFeeModalRowHover : undefined,
    }),
    [handleOpenFeeModal, isThorFreeTrade],
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
