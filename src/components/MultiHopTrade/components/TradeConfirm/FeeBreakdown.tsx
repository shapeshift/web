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

export const FeeBreakdown: React.FC<FeeBreakdownProps> = ({
  feeUsd,
  foxDiscountPercent,
  feeUsdBeforeDiscount,
  feeBpsBeforeDiscount,
  feeUsdDiscount,
}) => {
  const translate = useTranslate()
  return (
    <Stack spacing={6}>
      <Stack spacing={2}>
        <Heading as='h5'>Your FOX Power Discount</Heading>
        <RawText color='text.subtle'>Something about your FOX discount and trade fee.</RawText>
      </Stack>
      <Row>
        <Row.Label>Trade Fee</Row.Label>
        <Row.Value textAlign='right'>
          <Amount.Fiat value={feeUsdBeforeDiscount} />
          <Amount fontSize='sm' value={feeBpsBeforeDiscount} suffix='bps' />
        </Row.Value>
      </Row>
      <Row>
        <Row.Label>{translate('foxDiscounts.foxPowerDiscount')}</Row.Label>
        <Row.Value textAlign='right'>
          <Amount.Fiat value={feeUsdDiscount} />
          <Amount.Percent fontSize='sm' value={foxDiscountPercent} color='text.success' />
        </Row.Value>
      </Row>
      <Divider />
      <Row>
        <Row.Label>Total Trade Fee</Row.Label>
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
