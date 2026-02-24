import { Button, CardBody, CardFooter, Flex, Stack, VStack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { BigAmount } from '@shapeshiftoss/utils'
import { useCallback, useMemo, useState } from 'react'
import type { NumberFormatValues } from 'react-number-format'
import { NumericFormat } from 'react-number-format'
import { useTranslate } from 'react-polyglot'

import { CollateralMachineCtx } from './CollateralMachineContext'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { SlideTransition } from '@/components/SlideTransition'
import { RawText } from '@/components/Text'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { useChainflipBorrowMinimums } from '@/pages/ChainflipLending/hooks/useChainflipBorrowMinimums'
import { allowedDecimalSeparators } from '@/state/slices/preferencesSlice/preferencesSlice'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type CollateralInputProps = {
  assetId: AssetId
}

export const CollateralInput = ({ assetId }: CollateralInputProps) => {
  const translate = useTranslate()
  const {
    number: { localeParts },
  } = useLocaleFormatter()

  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const actorRef = CollateralMachineCtx.useActorRef()
  const mode = CollateralMachineCtx.useSelector(s => s.context.mode)
  const freeBalanceCryptoBaseUnit = CollateralMachineCtx.useSelector(
    s => s.context.freeBalanceCryptoBaseUnit,
  )
  const collateralBalanceCryptoBaseUnit = CollateralMachineCtx.useSelector(
    s => s.context.collateralBalanceCryptoBaseUnit,
  )

  const [inputValue, setInputValue] = useState('')

  const isAddMode = useMemo(() => mode === 'add', [mode])

  const availableBaseUnit = useMemo(
    () => (isAddMode ? freeBalanceCryptoBaseUnit : collateralBalanceCryptoBaseUnit),
    [isAddMode, freeBalanceCryptoBaseUnit, collateralBalanceCryptoBaseUnit],
  )

  const availableCryptoPrecision = useMemo(
    () =>
      BigAmount.fromBaseUnit({
        value: availableBaseUnit,
        precision: asset?.precision ?? 0,
      }).toPrecision(),
    [availableBaseUnit, asset?.precision],
  )

  const { minimumUpdateCollateralAmountUsd } = useChainflipBorrowMinimums()

  const isBelowMinimum = useMemo(() => {
    if (!minimumUpdateCollateralAmountUsd) return false
    const amount = bnOrZero(inputValue)
    return amount.gt(0) && amount.lt(minimumUpdateCollateralAmountUsd)
  }, [inputValue, minimumUpdateCollateralAmountUsd])

  const hasAvailableBalance = useMemo(() => bnOrZero(availableBaseUnit).gt(0), [availableBaseUnit])

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
      collateralAmountCryptoPrecision: inputValue,
      collateralAmountCryptoBaseUnit: baseUnit,
    })
  }, [actorRef, inputValue, asset])

  const isSubmitDisabled = useMemo(
    () =>
      bnOrZero(inputValue).isZero() ||
      isBelowMinimum ||
      bnOrZero(inputValue).gt(availableCryptoPrecision) ||
      !hasAvailableBalance,
    [inputValue, isBelowMinimum, availableCryptoPrecision, hasAvailableBalance],
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
              {translate('chainflipLending.collateral.amount')}
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
            <HelperTooltip
              label={translate(
                isAddMode
                  ? 'chainflipLending.collateral.availableToAdd'
                  : 'chainflipLending.collateral.availableToRemove',
              )}
            >
              <RawText fontSize='sm' color='text.subtle'>
                {translate(
                  isAddMode
                    ? 'chainflipLending.collateral.availableToAdd'
                    : 'chainflipLending.collateral.availableToRemove',
                )}
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
                isDisabled={!hasAvailableBalance}
              >
                {translate('modals.send.sendForm.max')}
              </Button>
            </Flex>
          </Flex>

          {minimumUpdateCollateralAmountUsd && (
            <Flex justifyContent='space-between' alignItems='center'>
              <RawText fontSize='sm' color='text.subtle'>
                {translate('chainflipLending.collateral.amount', {
                  amount: `$${minimumUpdateCollateralAmountUsd}`,
                })}
              </RawText>
              {isBelowMinimum && (
                <RawText fontSize='sm' color='red.500'>
                  {translate('chainflipLending.collateral.amount')}
                </RawText>
              )}
            </Flex>
          )}

          {!hasAvailableBalance && (
            <RawText fontSize='xs' color='yellow.500'>
              {translate(
                isAddMode
                  ? 'chainflipLending.collateral.availableToAdd'
                  : 'chainflipLending.collateral.availableToRemove',
              )}
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
          {translate(
            isAddMode ? 'chainflipLending.collateral.add' : 'chainflipLending.collateral.remove',
          )}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
}
