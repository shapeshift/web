import { Divider, Heading, Stack } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { Row } from 'components/Row/Row'
import { RawText } from 'components/Text'
import { BigNumber } from 'lib/bignumber/bignumber'
import { FEE_MODEL_TO_FEATURE_NAME } from 'lib/fees/parameters'
import type { ParameterModel } from 'lib/fees/parameters/types'
import { selectCalculatedFees } from 'state/apis/snapshot/selectors'
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
  } = useAppSelector(state => selectCalculatedFees(state, { feeModel, inputAmountUsd }))

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
          <Row.Label>{translate('foxDiscounts.foxPowerDiscount')}</Row.Label>
          <Row.Value textAlign='right'>
            <Amount.Fiat
              fiatType='USD'
              value={foxDiscountUsd.toFixed(2, BigNumber.ROUND_HALF_UP)}
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
          <Amount.Fiat
            fiatType='USD'
            value={affiliateFeeAmountUsd.toFixed(2, BigNumber.ROUND_HALF_UP)}
          />
        </Row.Value>
      </Row>
    </Stack>
  )
}
