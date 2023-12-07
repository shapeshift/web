import { Divider, Heading, Stack } from '@chakra-ui/react'
import React from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'

type FeeBreakdownProps = {
  feeBps: string
  feeUserCurrency: string
  foxDiscountPercent: string
  feeBeforeDiscountUserCurrency: string
  feeBpsBeforeDiscount: string
  feeDiscountUserCurrency: string
}

const divider = <Divider />

export const FeeBreakdown: React.FC<FeeBreakdownProps> = ({
  feeUserCurrency,
  foxDiscountPercent,
  feeBeforeDiscountUserCurrency,
  feeBpsBeforeDiscount,
  feeDiscountUserCurrency,
}) => {
  const translate = useTranslate()
  return (
    <Stack spacing={0}>
      <Stack spacing={2} px={8} pt={8} mb={8}>
        <Heading as='h5'>{translate('foxDiscounts.breakdownHeader')}</Heading>
        <RawText color='text.subtle'>{translate('foxDiscounts.breakdownBody')}</RawText>
      </Stack>
      <Stack px={8} mb={6} spacing={4} divider={divider}>
        <Row>
          <Row.Label>{translate('foxDiscounts.tradeFee')}</Row.Label>
          <Row.Value textAlign='right'>
            <Amount.Fiat value={feeBeforeDiscountUserCurrency} />
            <Amount color='text.subtle' fontSize='sm' value={feeBpsBeforeDiscount} suffix='bps' />
          </Row.Value>
        </Row>
        <Row>
          <Row.Label>{translate('foxDiscounts.foxPowerDiscount')}</Row.Label>
          <Row.Value textAlign='right'>
            <Amount.Fiat value={feeDiscountUserCurrency} />
            <Amount.Percent fontSize='sm' value={foxDiscountPercent} color='text.success' />
          </Row.Value>
        </Row>
      </Stack>
      <Divider />
      <Row px={8} py={4}>
        <Row.Label color='text.base'>{translate('foxDiscounts.totalTradeFee')}</Row.Label>
        <Row.Value fontSize='lg'>
          {bnOrZero(feeUserCurrency).eq(0) ? (
            <Text translation='common.free' color='text.success' />
          ) : (
            <Amount.Fiat value={feeUserCurrency} />
          )}
        </Row.Value>
      </Row>
    </Stack>
  )
}
