import { Button, CardBody, CardFooter, Flex, Stack, VStack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { BigAmount } from '@shapeshiftoss/utils'
import { useCallback, useMemo, useState } from 'react'
import type { NumberFormatValues } from 'react-number-format'
import { NumericFormat } from 'react-number-format'
import { useTranslate } from 'react-polyglot'

import { SupplyMachineCtx } from './SupplyMachineContext'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { SlideTransition } from '@/components/SlideTransition'
import { RawText } from '@/components/Text'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { useChainflipMinimumSupply } from '@/pages/ChainflipLending/hooks/useChainflipMinimumSupply'
import { allowedDecimalSeparators } from '@/state/slices/preferencesSlice/preferencesSlice'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type SupplyInputProps = {
  assetId: AssetId
}

export const SupplyInput = ({ assetId }: SupplyInputProps) => {
  const translate = useTranslate()
  const {
    number: { localeParts },
  } = useLocaleFormatter()

  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const actorRef = SupplyMachineCtx.useActorRef()
  const freeBalanceCryptoBaseUnit = SupplyMachineCtx.useSelector(
    s => s.context.freeBalanceCryptoBaseUnit,
  )

  const [inputValue, setInputValue] = useState('')

  const availableCryptoPrecision = useMemo(
    () =>
      BigAmount.fromBaseUnit({
        value: freeBalanceCryptoBaseUnit,
        precision: asset?.precision ?? 0,
      }).toPrecision(),
    [freeBalanceCryptoBaseUnit, asset?.precision],
  )

  const { minSupply, minSupplyUsd } = useChainflipMinimumSupply(assetId)

  const isBelowMinimum = useMemo(() => {
    if (!minSupply) return false
    const amount = bnOrZero(inputValue)
    return amount.gt(0) && amount.lt(minSupply)
  }, [inputValue, minSupply])

  const hasFreeBalance = useMemo(
    () => bnOrZero(freeBalanceCryptoBaseUnit).gt(0),
    [freeBalanceCryptoBaseUnit],
  )

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
      supplyAmountCryptoPrecision: inputValue,
      supplyAmountCryptoBaseUnit: baseUnit,
    })
  }, [actorRef, inputValue, asset])

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
              {translate('chainflipLending.supply.amount')}
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
            <HelperTooltip label={translate('chainflipLending.supply.availableTooltip')}>
              <RawText fontSize='sm' color='text.subtle'>
                {translate('chainflipLending.supply.available')}
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

          {minSupplyUsd && (
            <Flex justifyContent='space-between' alignItems='center'>
              <RawText fontSize='sm' color='text.subtle'>
                {translate('chainflipLending.supply.minimumSupply', {
                  amount: `$${minSupplyUsd}`,
                })}
              </RawText>
              {isBelowMinimum && minSupply && (
                <RawText fontSize='sm' color='red.500'>
                  {minSupply} {asset.symbol}
                </RawText>
              )}
            </Flex>
          )}

          {!hasFreeBalance && (
            <RawText fontSize='xs' color='yellow.500'>
              {translate('chainflipLending.supply.noFreeBalance')}
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
          {translate('chainflipLending.supply.title')}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
}
