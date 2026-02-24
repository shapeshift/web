import { Button, CardBody, CardFooter, Flex, Stack, VStack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { BigAmount } from '@shapeshiftoss/utils'
import { useCallback, useMemo, useState } from 'react'
import type { NumberFormatValues } from 'react-number-format'
import { NumericFormat } from 'react-number-format'
import { useTranslate } from 'react-polyglot'

import { BorrowMachineCtx } from './BorrowMachineContext'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { SlideTransition } from '@/components/SlideTransition'
import { RawText } from '@/components/Text'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { CHAINFLIP_LENDING_ASSET_BY_ASSET_ID } from '@/lib/chainflip/constants'
import { useChainflipAccount } from '@/pages/ChainflipLending/hooks/useChainflipAccount'
import { useChainflipBorrowMinimums } from '@/pages/ChainflipLending/hooks/useChainflipBorrowMinimums'
import { allowedDecimalSeparators } from '@/state/slices/preferencesSlice/preferencesSlice'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type BorrowInputProps = {
  assetId: AssetId
}

const MAX_LTV_BPS = 8000

const ltvColorByBps = (bps: number): string => {
  if (bps >= 7500) return 'red.500'
  if (bps >= 5000) return 'yellow.500'
  return 'green.500'
}

export const BorrowInput = ({ assetId }: BorrowInputProps) => {
  const translate = useTranslate()
  const {
    number: { localeParts },
  } = useLocaleFormatter()

  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const actorRef = BorrowMachineCtx.useActorRef()
  const currentLtvBps = BorrowMachineCtx.useSelector(s => s.context.currentLtvBps)

  const { freeBalances } = useChainflipAccount()
  const cfAsset = useMemo(() => CHAINFLIP_LENDING_ASSET_BY_ASSET_ID[assetId], [assetId])

  const freeBalanceCryptoBaseUnit = useMemo(() => {
    if (!freeBalances || !cfAsset) return '0'
    const matching = freeBalances.find(
      b => b.asset.chain === cfAsset.chain && b.asset.asset === cfAsset.asset,
    )
    return matching?.balance ?? '0'
  }, [freeBalances, cfAsset])

  const [inputValue, setInputValue] = useState('')

  const availableCryptoPrecision = useMemo(
    () =>
      BigAmount.fromBaseUnit({
        value: freeBalanceCryptoBaseUnit,
        precision: asset?.precision ?? 0,
      }).toPrecision(),
    [freeBalanceCryptoBaseUnit, asset?.precision],
  )

  const { minimumLoanAmountUsd } = useChainflipBorrowMinimums()

  const isBelowMinimum = useMemo(() => {
    if (!minimumLoanAmountUsd) return false
    const amount = bnOrZero(inputValue)
    return amount.gt(0) && amount.lt(minimumLoanAmountUsd)
  }, [inputValue, minimumLoanAmountUsd])

  const hasFreeBalance = useMemo(
    () => bnOrZero(freeBalanceCryptoBaseUnit).gt(0),
    [freeBalanceCryptoBaseUnit],
  )

  const currentLtvPercent = useMemo(() => (currentLtvBps / 100).toFixed(1), [currentLtvBps])

  const projectedLtvBps = useMemo(() => {
    const amount = bnOrZero(inputValue)
    if (amount.isZero()) return currentLtvBps
    return Math.min(currentLtvBps + Math.round(amount.toNumber() * 100), MAX_LTV_BPS)
  }, [inputValue, currentLtvBps])

  const projectedLtvPercent = useMemo(() => (projectedLtvBps / 100).toFixed(1), [projectedLtvBps])

  const handleInputChange = useCallback((values: NumberFormatValues) => {
    setInputValue(values.value)
  }, [])

  const handleMaxClick = useCallback(() => {
    setInputValue(availableCryptoPrecision)
  }, [availableCryptoPrecision])

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
      bnOrZero(inputValue).gt(availableCryptoPrecision) ||
      !hasFreeBalance,
    [inputValue, isBelowMinimum, availableCryptoPrecision, hasFreeBalance],
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
          </Stack>

          <Flex justifyContent='space-between' alignItems='center'>
            <HelperTooltip label={translate('chainflipLending.borrow.availableTooltip')}>
              <RawText fontSize='sm' color='text.subtle'>
                {translate('chainflipLending.borrow.available')}
              </RawText>
            </HelperTooltip>
            <Flex alignItems='center' gap={2}>
              <Amount.Crypto
                value={availableCryptoPrecision}
                symbol={asset.symbol}
                fontSize='sm'
                fontWeight='medium'
              />
              <Button
                size='xs'
                variant='ghost'
                colorScheme='blue'
                onClick={handleMaxClick}
                isDisabled={!hasFreeBalance}
              >
                {translate('modals.send.sendForm.max')}
              </Button>
            </Flex>
          </Flex>

          <Flex justifyContent='space-between' alignItems='center'>
            <RawText fontSize='sm' color='text.subtle'>
              {translate('chainflipLending.borrow.currentLtv')}
            </RawText>
            <RawText fontSize='sm' fontWeight='medium' color={ltvColorByBps(currentLtvBps)}>
              {currentLtvPercent}%
            </RawText>
          </Flex>

          <Flex justifyContent='space-between' alignItems='center'>
            <RawText fontSize='sm' color='text.subtle'>
              {translate('chainflipLending.borrow.projectedLtv')}
            </RawText>
            <RawText fontSize='sm' fontWeight='medium' color={ltvColorByBps(projectedLtvBps)}>
              {projectedLtvPercent}%
            </RawText>
          </Flex>

          <Flex justifyContent='space-between' alignItems='center'>
            <RawText fontSize='sm' color='text.subtle'>
              {translate('chainflipLending.borrow.maxLtv')}
            </RawText>
            <RawText fontSize='sm' fontWeight='medium'>
              {(MAX_LTV_BPS / 100).toFixed(0)}%
            </RawText>
          </Flex>

          {minimumLoanAmountUsd && (
            <Flex justifyContent='space-between' alignItems='center'>
              <RawText fontSize='sm' color='text.subtle'>
                {translate('chainflipLending.borrow.minimumLoan', {
                  amount: `$${minimumLoanAmountUsd}`,
                })}
              </RawText>
              {isBelowMinimum && (
                <RawText fontSize='sm' color='red.500'>
                  {minimumLoanAmountUsd} {asset.symbol}
                </RawText>
              )}
            </Flex>
          )}

          {!hasFreeBalance && (
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
