import { Divider, Heading, Stack } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { calculateFees } from 'lib/fees/model'
import { selectVotingPower } from 'state/apis/snapshot/selectors'
import { selectSellAmountUsd, selectUserCurrencyToUsdRate } from 'state/slices/selectors'
import { selectQuoteAffiliateFeeUserCurrency } from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

const divider = <Divider />

export const FeeBreakdown = () => {
  const translate = useTranslate()
  const votingPower = useAppSelector(selectVotingPower)
  const sellAmountUsd = useAppSelector(selectSellAmountUsd)
  const { foxDiscountUsd, foxDiscountPercent, feeUsdBeforeDiscount, feeBpsBeforeDiscount } =
    calculateFees({
      tradeAmountUsd: bnOrZero(sellAmountUsd),
      foxHeld: bnOrZero(votingPower),
    })

  const userCurrencyToUsdRate = useAppSelector(selectUserCurrencyToUsdRate)

  const feeBeforeDiscountUserCurrency = useMemo(() => {
    return feeUsdBeforeDiscount.times(userCurrencyToUsdRate).toFixed(2)
  }, [feeUsdBeforeDiscount, userCurrencyToUsdRate])

  const feeDiscountUserCurrency = useMemo(() => {
    return foxDiscountUsd.times(userCurrencyToUsdRate).toFixed(2)
  }, [foxDiscountUsd, userCurrencyToUsdRate])

  // use the fee from the actual quote in case it varies from the theoretical calculation
  const affiliateFeeAmountUserCurrency = useAppSelector(selectQuoteAffiliateFeeUserCurrency)

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
            <Amount.Percent
              fontSize='sm'
              value={foxDiscountPercent.div(100).toNumber()}
              color='text.success'
            />
          </Row.Value>
        </Row>
      </Stack>
      <Divider />
      <Row px={8} py={4}>
        <Row.Label color='text.base'>{translate('foxDiscounts.totalTradeFee')}</Row.Label>
        <Row.Value fontSize='lg'>
          {bnOrZero(affiliateFeeAmountUserCurrency).eq(0) ? (
            <Text translation='common.free' color='text.success' />
          ) : (
            <Amount.Fiat value={affiliateFeeAmountUserCurrency} />
          )}
        </Row.Value>
      </Row>
    </Stack>
  )
}
