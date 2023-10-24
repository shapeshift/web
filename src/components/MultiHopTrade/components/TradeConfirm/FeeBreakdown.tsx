import { Divider, Heading, Stack } from '@chakra-ui/react'
import React from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'

type FeeBreakdownProps = {
  feeBps: string
  feeUsd: string
  foxDiscountPercent: string
  feeUsdBeforeDiscount: string
  feeBpsBeforeDiscount: string
  feeUsdDiscount: string
}

const divider = <Divider />

export const FeeBreakdown: React.FC<FeeBreakdownProps> = ({
  feeUsd,
  foxDiscountPercent,
  feeUsdBeforeDiscount,
  feeBpsBeforeDiscount,
  feeUsdDiscount,
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
            <Amount.Fiat value={feeUsdBeforeDiscount} />
            <Amount color='text.subtle' fontSize='sm' value={feeBpsBeforeDiscount} suffix='bps' />
          </Row.Value>
        </Row>
        <Row>
          <Row.Label>{translate('foxDiscounts.foxPowerDiscount')}</Row.Label>
          <Row.Value textAlign='right'>
            <Amount.Fiat value={feeUsdDiscount} />
            <Amount.Percent fontSize='sm' value={foxDiscountPercent} color='text.success' />
          </Row.Value>
        </Row>
      </Stack>
      <Divider />
      <Row px={8} py={4}>
        <Row.Label color='text.base'>{translate('foxDiscounts.totalTradeFee')}</Row.Label>
        <Row.Value fontSize='lg'>
          {bnOrZero(feeUsd).eq(0) ? (
            <Text translation='common.free' color='text.success' />
          ) : (
            <Amount.Fiat value={feeUsd} />
          )}
        </Row.Value>
      </Row>
    </Stack>
  )
}
