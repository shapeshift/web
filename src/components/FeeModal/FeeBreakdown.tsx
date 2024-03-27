import { Divider, Heading, Stack } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { FEE_MODEL_TO_FEATURE_NAME } from 'lib/fees/parameters'
import type { ParameterModel } from 'lib/fees/parameters/types'
import { selectCalculatedFees } from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

const divider = <Divider />

const AmountOrFree = ({ isFree, amountUSD }: { isFree: boolean; amountUSD: string }) => {
  return isFree ? (
    <Text translation='common.free' color='text.success' />
  ) : (
    <Amount.Fiat fiatType='USD' value={amountUSD} />
  )
}

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
    foxDiscountPercent,
    feeUsdBeforeDiscount,
  } = useAppSelector(state => selectCalculatedFees(state, { feeModel, inputAmountUsd }))

  const isFree = useMemo(() => bnOrZero(affiliateFeeAmountUsd).eq(0), [affiliateFeeAmountUsd])

  const isFeeUnsupported = useMemo(() => {
    return affiliateFeeAmountUsd.isZero() && bnOrZero(feeUsdBeforeDiscount).gt(0)
  }, [affiliateFeeAmountUsd, feeUsdBeforeDiscount])

  const feeDiscountUsd = useMemo(() => {
    return isFeeUnsupported ? '0.00' : foxDiscountUsd.toFixed(2)
  }, [foxDiscountUsd, isFeeUnsupported])

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
            <AmountOrFree isFree={isFeeUnsupported} amountUSD={feeUsdBeforeDiscount.toFixed(2)} />
          </Row.Value>
        </Row>
        <Row>
          <Row.Label>{translate('foxDiscounts.foxPowerDiscount')}</Row.Label>
          <Row.Value textAlign='right'>
            <Amount.Fiat fiatType='USD' value={feeDiscountUsd} />
            <Amount.Percent
              fontSize='sm'
              value={isFree ? 1 : foxDiscountPercent.div(100).toNumber()}
              color='text.success'
            />
          </Row.Value>
        </Row>
      </Stack>
      <Divider />
      <Row px={8} py={4}>
        <Row.Label color='text.base'>
          {translate('foxDiscounts.totalFeatureFee', { feature })}
        </Row.Label>
        <Row.Value fontSize='lg'>
          <AmountOrFree isFree={isFree} amountUSD={affiliateFeeAmountUsd.toString()} />
        </Row.Value>
      </Row>
    </Stack>
  )
}
