import { Divider, Heading, Stack, useColorModeValue } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { BigNumber } from 'lib/bignumber/bignumber'
import { FEE_MODEL_TO_FEATURE_NAME } from 'lib/fees/parameters'
import type { ParameterModel } from 'lib/fees/parameters/types'
import { selectAppliedDiscountType, selectCalculatedFees } from 'state/apis/snapshot/selectors'
import { useAppSelector } from 'state/store'

const divider = <Divider />

type FeeBreakdownProps = {
  feeModel: ParameterModel
  inputAmountUsd: string | undefined
}

export const FeeBreakdown = ({ feeModel, inputAmountUsd }: FeeBreakdownProps) => {
  const translate = useTranslate()
  const feature = translate(FEE_MODEL_TO_FEATURE_NAME[feeModel])
  const featureFeeTranslation = translate('foxDiscounts.featureFee', { feature })
  const {
    feeUsd: affiliateFeeAmountUsd,
    foxDiscountUsd,
    feeUsdBeforeDiscount,
    feeBps,
  } = useAppSelector(state => selectCalculatedFees(state, { feeModel, inputAmountUsd }))
  const appliedDiscountType = useAppSelector(state =>
    selectAppliedDiscountType(state, { feeModel, inputAmountUsd }),
  )
  const greenColor = useColorModeValue('green.500', 'green.300')

  const discountTypeTranslation = useMemo(() => {
    return translate(`foxDiscounts.${appliedDiscountType}`)
  }, [appliedDiscountType, translate])

  const discountLabelTranslation = useMemo(() => {
    return translate(`foxDiscounts.discountLabel`, { discountType: discountTypeTranslation })
  }, [discountTypeTranslation, translate])

  const totalAmount = useMemo(() => {
    if (feeBps.isZero())
      return (
        <Row.Value fontSize='lg'>
          <Text translation='trade.free' fontWeight='semibold' color={greenColor} />
        </Row.Value>
      )

    return (
      <Row.Value fontSize='lg'>
        <Amount.Fiat
          fiatType='USD'
          value={affiliateFeeAmountUsd.toFixed(2, BigNumber.ROUND_HALF_UP)}
        />
      </Row.Value>
    )
  }, [affiliateFeeAmountUsd, feeBps, greenColor])

  const totalDiscount = useMemo(() => {
    if (feeBps.isZero()) return feeUsdBeforeDiscount.toFixed(2, BigNumber.ROUND_HALF_UP)

    return foxDiscountUsd.toFixed(2, BigNumber.ROUND_HALF_UP)
  }, [feeUsdBeforeDiscount, foxDiscountUsd, feeBps])

  return (
    <Stack spacing={0}>
      <Stack spacing={2} px={8} pt={8} mb={8}>
        <Heading as='h5'>{translate('foxDiscounts.breakdownHeader')}</Heading>
        <RawText color='text.subtle'>
          {translate('foxDiscounts.breakdownBody', {
            // Only lowercase the feature if it's a one-word one e.g trade
            // Assume multiple words should keep their capitalization to keep things simple and avoid more translation strings
            featureLowerCase: feature.split(' ').length > 1 ? feature : feature.toLowerCase(),
          })}
        </RawText>
      </Stack>
      <Stack px={8} mb={6} spacing={4} divider={divider}>
        <Row>
          <Row.Label>{featureFeeTranslation}</Row.Label>
          <Row.Value textAlign='right'>
            <Amount.Fiat
              fiatType='USD'
              value={feeUsdBeforeDiscount.toFixed(2, BigNumber.ROUND_HALF_UP)}
            />
          </Row.Value>
        </Row>
        <Row>
          <Row.Label>{discountLabelTranslation}</Row.Label>
          <Row.Value textAlign='right'>
            <Amount.Fiat fiatType='USD' value={totalDiscount} />
          </Row.Value>
        </Row>
      </Stack>
      <Divider />
      <Row px={8} py={4}>
        <Row.Label color='text.base'>
          {translate('foxDiscounts.totalFeatureFee', { feature })}
        </Row.Label>
        {totalAmount}
      </Row>
    </Stack>
  )
}
