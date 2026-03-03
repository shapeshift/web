import { Button, CardBody, CardFooter, Flex, Stack, VStack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { BigAmount } from '@shapeshiftoss/utils'
import { useCallback, useMemo, useState } from 'react'
import type { NumberFormatValues } from 'react-number-format'
import { NumericFormat } from 'react-number-format'
import { useTranslate } from 'react-polyglot'

import { BorrowMachineCtx } from './BorrowMachineContext'
import { LtvGauge } from './LtvGauge'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { SlideTransition } from '@/components/SlideTransition'
import { RawText } from '@/components/Text'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { useChainflipBorrowMinimums } from '@/pages/ChainflipLending/hooks/useChainflipBorrowMinimums'
import { useChainflipLoanAccount } from '@/pages/ChainflipLending/hooks/useChainflipLoanAccount'
import { useChainflipLtvThresholds } from '@/pages/ChainflipLending/hooks/useChainflipLtvThresholds'
import { useChainflipOraclePrice } from '@/pages/ChainflipLending/hooks/useChainflipOraclePrices'
import { allowedDecimalSeparators } from '@/state/slices/preferencesSlice/preferencesSlice'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type BorrowInputProps = {
  assetId: AssetId
}

export const BorrowInput = ({ assetId }: BorrowInputProps) => {
  const translate = useTranslate()
  const {
    number: { localeParts },
  } = useLocaleFormatter()

  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const { oraclePrice } = useChainflipOraclePrice(assetId)
  const assetPrice = useMemo(() => bnOrZero(oraclePrice), [oraclePrice])

  const actorRef = BorrowMachineCtx.useActorRef()
  const currentLtvBps = BorrowMachineCtx.useSelector(s => s.context.currentLtvBps)

  const { totalCollateralFiat, totalBorrowedFiat, loansWithFiat } = useChainflipLoanAccount()
  const { thresholds } = useChainflipLtvThresholds()
  const { minimumLoanAmountUsd, minimumUpdateLoanAmountUsd } = useChainflipBorrowMinimums()

  const hasExistingLoans = useMemo(() => loansWithFiat.length > 0, [loansWithFiat])
  const effectiveMinimumUsd = useMemo(
    () => (hasExistingLoans ? minimumUpdateLoanAmountUsd : minimumLoanAmountUsd),
    [hasExistingLoans, minimumUpdateLoanAmountUsd, minimumLoanAmountUsd],
  )

  const [inputValue, setInputValue] = useState('')

  const hasCollateral = useMemo(() => bnOrZero(totalCollateralFiat).gt(0), [totalCollateralFiat])

  const availableToBorrowCryptoPrecision = useMemo(() => {
    if (!hasCollateral || assetPrice.isZero() || !thresholds) return '0'
    const maxBorrowFiat = bnOrZero(totalCollateralFiat)
      .times(thresholds.target)
      .minus(totalBorrowedFiat)
    if (maxBorrowFiat.lte(0)) return '0'
    return maxBorrowFiat.div(assetPrice).toFixed(asset?.precision ?? 6)
  }, [
    hasCollateral,
    assetPrice,
    thresholds,
    totalCollateralFiat,
    totalBorrowedFiat,
    asset?.precision,
  ])

  const inputFiat = useMemo(() => bnOrZero(inputValue).times(assetPrice), [inputValue, assetPrice])

  const isBelowMinimum = useMemo(() => {
    if (!effectiveMinimumUsd) return false
    return inputFiat.gt(0) && inputFiat.lt(effectiveMinimumUsd)
  }, [inputFiat, effectiveMinimumUsd])

  const currentLtvDecimal = useMemo(() => currentLtvBps / 10000, [currentLtvBps])

  const projectedLtvBps = useMemo(() => {
    const totalCollateral = bnOrZero(totalCollateralFiat)
    if (totalCollateral.isZero() || inputFiat.isZero()) return currentLtvBps
    const projectedDecimal = bnOrZero(totalBorrowedFiat).plus(inputFiat).div(totalCollateral)
    return Math.min(Math.round(projectedDecimal.times(10000).toNumber()), 10000)
  }, [totalCollateralFiat, totalBorrowedFiat, inputFiat, currentLtvBps])

  const projectedLtvDecimal = useMemo(() => projectedLtvBps / 10000, [projectedLtvBps])

  const handleInputChange = useCallback((values: NumberFormatValues) => {
    setInputValue(values.value)
  }, [])

  const handleMaxClick = useCallback(() => {
    setInputValue(availableToBorrowCryptoPrecision)
  }, [availableToBorrowCryptoPrecision])

  const handleSubmit = useCallback(() => {
    if (!asset) return
    const baseUnit = BigAmount.fromPrecision({
      value: inputValue || '0',
      precision: asset.precision,
    }).toBaseUnit()

    actorRef.send({
      type: 'SUBMIT',
      borrowAmountCryptoPrecision: inputValue,
      borrowAmountCryptoBaseUnit: baseUnit,
      collateralTopupAssetId: null,
      extraCollateral: [],
      projectedLtvBps,
    })
  }, [actorRef, inputValue, asset, projectedLtvBps])

  const isSubmitDisabled = useMemo(
    () =>
      bnOrZero(inputValue).isZero() ||
      isBelowMinimum ||
      bnOrZero(inputValue).gt(availableToBorrowCryptoPrecision) ||
      !hasCollateral,
    [inputValue, isBelowMinimum, availableToBorrowCryptoPrecision, hasCollateral],
  )

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

          <Stack spacing={1}>
            <RawText fontSize='sm' color='text.subtle'>
              {translate('chainflipLending.borrow.amount')}
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

          <Flex justifyContent='space-between' alignItems='center'>
            <HelperTooltip label={translate('chainflipLending.borrow.availableTooltip')}>
              <RawText fontSize='sm' color='text.subtle'>
                {translate('chainflipLending.borrow.available')}
              </RawText>
            </HelperTooltip>
            <Flex alignItems='center' gap={2}>
              <Amount.Crypto
                value={availableToBorrowCryptoPrecision}
                symbol={asset.symbol}
                fontSize='sm'
                fontWeight='medium'
              />
              <Button
                size='xs'
                variant='ghost'
                colorScheme='blue'
                onClick={handleMaxClick}
                isDisabled={!hasCollateral || bnOrZero(availableToBorrowCryptoPrecision).isZero()}
              >
                {translate('modals.send.sendForm.max')}
              </Button>
            </Flex>
          </Flex>

          {hasCollateral && (
            <LtvGauge
              currentLtv={currentLtvDecimal}
              projectedLtv={bnOrZero(inputValue).gt(0) ? projectedLtvDecimal : undefined}
            />
          )}

          {effectiveMinimumUsd && isBelowMinimum && (
            <RawText fontSize='xs' color='red.500'>
              {translate('chainflipLending.borrow.minimumLoan', {
                amount: `$${effectiveMinimumUsd}`,
              })}
            </RawText>
          )}

          {!hasCollateral && (
            <RawText fontSize='xs' color='yellow.500'>
              {translate('chainflipLending.borrow.noCollateral')}
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
          {translate('chainflipLending.borrow.title')}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
}
