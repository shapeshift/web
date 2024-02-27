import { Divider, Heading, Stack } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { calculateFees } from 'lib/fees/model'
import { feeCurveParameters } from 'lib/fees/parameters'
import { selectVotingPower } from 'state/apis/snapshot/selectors'
import { selectInputSellAmountUsd, selectUserCurrencyToUsdRate } from 'state/slices/selectors'
import { selectQuoteAffiliateFeeUserCurrency } from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

const divider = <Divider />

const AmountOrFree = ({ isFree, amountFiat }: { isFree: boolean; amountFiat: string }) => {
  return isFree ? (
    <Text translation='common.free' color='text.success' />
  ) : (
    <Amount.Fiat value={amountFiat} />
  )
}

export const FeeBreakdown = () => {
  const translate = useTranslate()
  const votingPower = useAppSelector(selectVotingPower)
  const sellAmountUsd = useAppSelector(selectInputSellAmountUsd)
  const { foxDiscountUsd, foxDiscountPercent, feeUsdBeforeDiscount, feeBpsBeforeDiscount } =
    calculateFees({
      tradeAmountUsd: bnOrZero(sellAmountUsd),
      foxHeld: votingPower !== undefined ? bn(votingPower) : undefined,
      parameters: feeCurveParameters.swapper,
    })

  const userCurrencyToUsdRate = useAppSelector(selectUserCurrencyToUsdRate)

  const feeBeforeDiscountUserCurrency = useMemo(() => {
    return feeUsdBeforeDiscount.times(userCurrencyToUsdRate).toFixed(2)
  }, [feeUsdBeforeDiscount, userCurrencyToUsdRate])

  // use the fee from the actual quote in case it varies from the theoretical calculation
  const affiliateFeeAmountUserCurrency = useAppSelector(selectQuoteAffiliateFeeUserCurrency)

  const isFree = useMemo(
    () => bnOrZero(affiliateFeeAmountUserCurrency).eq(0),
    [affiliateFeeAmountUserCurrency],
  )

  const isFeeUnsupported = useMemo(() => {
    return affiliateFeeAmountUserCurrency === '0' && bnOrZero(feeBeforeDiscountUserCurrency).gt(0)
  }, [affiliateFeeAmountUserCurrency, feeBeforeDiscountUserCurrency])

  const feeDiscountUserCurrency = useMemo(() => {
    return isFeeUnsupported ? '0.00' : foxDiscountUsd.times(userCurrencyToUsdRate).toFixed(2)
  }, [foxDiscountUsd, isFeeUnsupported, userCurrencyToUsdRate])

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
            <AmountOrFree isFree={isFeeUnsupported} amountFiat={feeBeforeDiscountUserCurrency} />
            <Amount
              color='text.subtle'
              fontSize='sm'
              value={isFree ? '0' : feeBpsBeforeDiscount}
              suffix='bps'
            />
          </Row.Value>
        </Row>
        <Row>
          <Row.Label>{translate('foxDiscounts.currentFoxPower')}</Row.Label>
          <Row.Value textAlign='right'>
            <Amount.Crypto value={votingPower ?? '0'} symbol='FOX' maximumFractionDigits={0} />
          </Row.Value>
        </Row>
        {!isFeeUnsupported && (
          <Row>
            <Row.Label>{translate('foxDiscounts.foxPowerDiscount')}</Row.Label>
            <Row.Value textAlign='right'>
              <Amount.Fiat value={feeDiscountUserCurrency} />
              <Amount.Percent
                fontSize='sm'
                value={isFree ? 1 : foxDiscountPercent.div(100).toNumber()}
                color='text.success'
              />
            </Row.Value>
          </Row>
        )}
      </Stack>
      <Divider />
      <Row px={8} py={4}>
        <Row.Label color='text.base'>{translate('foxDiscounts.totalTradeFee')}</Row.Label>
        <Row.Value fontSize='lg'>
          <AmountOrFree isFree={isFree} amountFiat={affiliateFeeAmountUserCurrency} />
        </Row.Value>
      </Row>
    </Stack>
  )
}
