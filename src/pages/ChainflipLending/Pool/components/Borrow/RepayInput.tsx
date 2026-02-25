import { Button, CardBody, CardFooter, Flex, Stack, Switch, VStack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { BigAmount } from '@shapeshiftoss/utils'
import { useCallback, useMemo, useState } from 'react'
import type { NumberFormatValues } from 'react-number-format'
import { NumericFormat } from 'react-number-format'
import { useTranslate } from 'react-polyglot'

import { RepayMachineCtx } from './RepayMachineContext'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { SlideTransition } from '@/components/SlideTransition'
import { RawText } from '@/components/Text'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { useChainflipBorrowMinimums } from '@/pages/ChainflipLending/hooks/useChainflipBorrowMinimums'
import { useChainflipOraclePrice } from '@/pages/ChainflipLending/hooks/useChainflipOraclePrices'
import { allowedDecimalSeparators } from '@/state/slices/preferencesSlice/preferencesSlice'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type RepayInputProps = {
  assetId: AssetId
}

export const RepayInput = ({ assetId }: RepayInputProps) => {
  const translate = useTranslate()
  const {
    number: { localeParts },
  } = useLocaleFormatter()

  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const { oraclePrice } = useChainflipOraclePrice(assetId)
  const assetPrice = useMemo(() => bnOrZero(oraclePrice), [oraclePrice])

  const actorRef = RepayMachineCtx.useActorRef()
  const freeBalanceCryptoBaseUnit = RepayMachineCtx.useSelector(
    s => s.context.freeBalanceCryptoBaseUnit,
  )
  const outstandingDebtCryptoBaseUnit = RepayMachineCtx.useSelector(
    s => s.context.outstandingDebtCryptoBaseUnit,
  )

  const [inputValue, setInputValue] = useState('')
  const [isFullRepayment, setIsFullRepayment] = useState(false)

  const availableCryptoPrecision = useMemo(
    () =>
      BigAmount.fromBaseUnit({
        value: freeBalanceCryptoBaseUnit,
        precision: asset?.precision ?? 0,
      }).toPrecision(),
    [freeBalanceCryptoBaseUnit, asset?.precision],
  )

  const outstandingDebtCryptoPrecision = useMemo(
    () =>
      BigAmount.fromBaseUnit({
        value: outstandingDebtCryptoBaseUnit,
        precision: asset?.precision ?? 0,
      }).toPrecision(),
    [outstandingDebtCryptoBaseUnit, asset?.precision],
  )

  const { minimumUpdateLoanAmountUsd } = useChainflipBorrowMinimums()

  const hasFreeBalance = useMemo(
    () => bnOrZero(freeBalanceCryptoBaseUnit).gt(0),
    [freeBalanceCryptoBaseUnit],
  )

  const hasDebt = useMemo(
    () => bnOrZero(outstandingDebtCryptoBaseUnit).gt(0),
    [outstandingDebtCryptoBaseUnit],
  )

  const canAffordFullRepayment = useMemo(
    () => bnOrZero(availableCryptoPrecision).gte(outstandingDebtCryptoPrecision),
    [availableCryptoPrecision, outstandingDebtCryptoPrecision],
  )

  const inputFiat = useMemo(() => bnOrZero(inputValue).times(assetPrice), [inputValue, assetPrice])

  const isBelowMinimum = useMemo(() => {
    if (isFullRepayment) return false
    if (!minimumUpdateLoanAmountUsd) return false
    return inputFiat.gt(0) && inputFiat.lt(minimumUpdateLoanAmountUsd)
  }, [isFullRepayment, inputFiat, minimumUpdateLoanAmountUsd])

  const handleInputChange = useCallback((values: NumberFormatValues) => {
    setInputValue(values.value)
  }, [])

  const handleFullRepaymentToggle = useCallback(() => {
    setIsFullRepayment(prev => {
      const next = !prev
      if (next) {
        setInputValue(outstandingDebtCryptoPrecision)
      } else {
        setInputValue('')
      }
      return next
    })
  }, [outstandingDebtCryptoPrecision])

  const handleMaxClick = useCallback(() => {
    setInputValue(availableCryptoPrecision)
  }, [availableCryptoPrecision])

  const handleSubmit = useCallback(() => {
    if (!asset) return
    const baseUnit = isFullRepayment
      ? outstandingDebtCryptoBaseUnit
      : BigAmount.fromPrecision({
          value: inputValue || '0',
          precision: asset.precision,
        }).toBaseUnit()

    actorRef.send({
      type: 'SUBMIT',
      repayAmountCryptoPrecision: isFullRepayment ? outstandingDebtCryptoPrecision : inputValue,
      repayAmountCryptoBaseUnit: baseUnit,
      isFullRepayment,
    })
  }, [
    actorRef,
    inputValue,
    asset,
    isFullRepayment,
    outstandingDebtCryptoBaseUnit,
    outstandingDebtCryptoPrecision,
  ])

  const isSubmitDisabled = useMemo(() => {
    if (!hasDebt || !hasFreeBalance) return true
    if (isFullRepayment) return !canAffordFullRepayment
    const amount = bnOrZero(inputValue)
    return amount.isZero() || amount.gt(availableCryptoPrecision) || isBelowMinimum
  }, [
    inputValue,
    isFullRepayment,
    availableCryptoPrecision,
    hasFreeBalance,
    hasDebt,
    canAffordFullRepayment,
    isBelowMinimum,
  ])

  if (!asset) return null

  return (
    <SlideTransition>
      <CardBody px={6} py={4}>
        <VStack spacing={4} align='stretch'>
          <Flex alignItems='center' gap={2}>
            <AssetIcon assetId={assetId} size='sm' />
            <RawText fontWeight='bold' fontSize='lg'>
              {asset.symbol}
            </RawText>
          </Flex>

          <Flex justifyContent='space-between' alignItems='center'>
            <RawText fontSize='sm' color='text.subtle'>
              {translate('chainflipLending.repay.outstanding')}
            </RawText>
            <Amount.Crypto
              value={outstandingDebtCryptoPrecision}
              symbol={asset.symbol}
              fontSize='sm'
              fontWeight='medium'
            />
          </Flex>

          <Flex justifyContent='space-between' alignItems='center'>
            <RawText fontSize='sm' fontWeight='medium'>
              {translate('chainflipLending.repay.fullRepayment')}
            </RawText>
            <Switch
              isChecked={isFullRepayment}
              onChange={handleFullRepaymentToggle}
              colorScheme='blue'
              isDisabled={!hasDebt}
            />
          </Flex>

          {isFullRepayment && !canAffordFullRepayment && (
            <RawText fontSize='xs' color='red.500'>
              {translate('chainflipLending.repay.insufficientBalance')}
            </RawText>
          )}

          {!isFullRepayment && (
            <Stack spacing={1}>
              <RawText fontSize='sm' color='text.subtle'>
                {translate('chainflipLending.repay.amount')}
              </RawText>
              <NumericFormat
                inputMode='decimal'
                valueIsNumericString={true}
                decimalScale={asset.precision}
                thousandSeparator={localeParts.group}
                decimalSeparator={localeParts.decimal}
                allowedDecimalSeparators={allowedDecimalSeparators}
                allowNegative={false}
                allowLeadingZeros={false}
                value={inputValue}
                placeholder='0.00'
                onValueChange={handleInputChange}
                style={{
                  width: '100%',
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  padding: '0.5rem 0',
                }}
              />
              {!assetPrice.isZero() && bnOrZero(inputValue).gt(0) && (
                <Amount.Fiat value={inputFiat.toFixed(2)} fontSize='sm' color='text.subtle' />
              )}
            </Stack>
          )}

          <Flex justifyContent='space-between' alignItems='center'>
            <HelperTooltip label={translate('chainflipLending.repay.availableTooltip')}>
              <RawText fontSize='sm' color='text.subtle'>
                {translate('chainflipLending.repay.availableBalance')}
              </RawText>
            </HelperTooltip>
            <Flex alignItems='center' gap={2}>
              <Amount.Crypto
                value={availableCryptoPrecision}
                symbol={asset.symbol}
                fontSize='sm'
                fontWeight='medium'
              />
              {!isFullRepayment && (
                <Button
                  size='xs'
                  variant='ghost'
                  colorScheme='blue'
                  onClick={handleMaxClick}
                  isDisabled={!hasFreeBalance}
                >
                  {translate('modals.send.sendForm.max')}
                </Button>
              )}
            </Flex>
          </Flex>

          {!isFullRepayment && isBelowMinimum && minimumUpdateLoanAmountUsd && (
            <RawText fontSize='xs' color='red.500'>
              {translate('chainflipLending.repay.minimumRepayment', {
                amount: `$${minimumUpdateLoanAmountUsd}`,
              })}
            </RawText>
          )}

          {!hasFreeBalance && (
            <RawText fontSize='xs' color='yellow.500'>
              {translate('chainflipLending.repay.noFreeBalance')}
            </RawText>
          )}
        </VStack>
      </CardBody>

      <CardFooter
        borderTopWidth={1}
        borderColor='border.subtle'
        flexDir='column'
        gap={4}
        px={6}
        py={4}
      >
        <Button
          colorScheme='blue'
          size='lg'
          height={12}
          borderRadius='xl'
          width='full'
          fontWeight='bold'
          onClick={handleSubmit}
          isDisabled={isSubmitDisabled}
        >
          {translate('chainflipLending.repay.title')}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
}
