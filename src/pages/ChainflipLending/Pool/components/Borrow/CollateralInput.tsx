import { Button, CardBody, CardFooter, Flex, Stack, VStack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { BigAmount } from '@shapeshiftoss/utils'
import { useCallback, useMemo, useState } from 'react'
import type { NumberFormatValues } from 'react-number-format'
import { NumericFormat } from 'react-number-format'
import { useTranslate } from 'react-polyglot'

import { CollateralMachineCtx } from './CollateralMachineContext'
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

type CollateralInputProps = {
  assetId: AssetId
}

export const CollateralInput = ({ assetId }: CollateralInputProps) => {
  const translate = useTranslate()
  const {
    number: { localeParts },
  } = useLocaleFormatter()

  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const { oraclePrice } = useChainflipOraclePrice(assetId)
  const assetPrice = useMemo(() => bnOrZero(oraclePrice), [oraclePrice])

  const actorRef = CollateralMachineCtx.useActorRef()
  const mode = CollateralMachineCtx.useSelector(s => s.context.mode)
  const freeBalanceCryptoBaseUnit = CollateralMachineCtx.useSelector(
    s => s.context.freeBalanceCryptoBaseUnit,
  )
  const collateralBalanceCryptoBaseUnit = CollateralMachineCtx.useSelector(
    s => s.context.collateralBalanceCryptoBaseUnit,
  )

  const { totalCollateralFiat, totalBorrowedFiat } = useChainflipLoanAccount()
  const { thresholds } = useChainflipLtvThresholds()
  const { minimumUpdateCollateralAmountUsd } = useChainflipBorrowMinimums()

  const [inputValue, setInputValue] = useState('')

  const isAddMode = useMemo(() => mode === 'add', [mode])

  const freeBalanceCryptoPrecision = useMemo(
    () =>
      BigAmount.fromBaseUnit({
        value: freeBalanceCryptoBaseUnit,
        precision: asset?.precision ?? 0,
      }).toPrecision(),
    [freeBalanceCryptoBaseUnit, asset?.precision],
  )

  const collateralCryptoPrecision = useMemo(
    () =>
      BigAmount.fromBaseUnit({
        value: collateralBalanceCryptoBaseUnit,
        precision: asset?.precision ?? 0,
      }).toPrecision(),
    [collateralBalanceCryptoBaseUnit, asset?.precision],
  )

  const maxRemovableCryptoPrecision = useMemo(() => {
    if (isAddMode) return '0'
    const totalCollateral = bnOrZero(totalCollateralFiat)
    const totalBorrowed = bnOrZero(totalBorrowedFiat)
    if (totalBorrowed.isZero()) return collateralCryptoPrecision
    if (!thresholds || totalCollateral.isZero() || assetPrice.isZero()) return '0'
    const requiredCollateralFiat = totalBorrowed.div(thresholds.target)
    const removableFiat = totalCollateral.minus(requiredCollateralFiat)
    if (removableFiat.lte(0)) return '0'
    const removableCrypto = removableFiat.div(assetPrice)
    const collateral = bnOrZero(collateralCryptoPrecision)
    return removableCrypto.gt(collateral)
      ? collateral.toFixed(asset?.precision ?? 6)
      : removableCrypto.toFixed(asset?.precision ?? 6)
  }, [
    isAddMode,
    totalCollateralFiat,
    totalBorrowedFiat,
    thresholds,
    assetPrice,
    collateralCryptoPrecision,
    asset?.precision,
  ])

  const availableCryptoPrecision = useMemo(
    () => (isAddMode ? freeBalanceCryptoPrecision : maxRemovableCryptoPrecision),
    [isAddMode, freeBalanceCryptoPrecision, maxRemovableCryptoPrecision],
  )

  const inputFiat = useMemo(() => bnOrZero(inputValue).times(assetPrice), [inputValue, assetPrice])

  const isBelowMinimum = useMemo(() => {
    if (!minimumUpdateCollateralAmountUsd) return false
    return inputFiat.gt(0) && inputFiat.lt(minimumUpdateCollateralAmountUsd)
  }, [inputFiat, minimumUpdateCollateralAmountUsd])

  const hasAvailableBalance = useMemo(
    () => bnOrZero(availableCryptoPrecision).gt(0),
    [availableCryptoPrecision],
  )

  const currentLtvDecimal = useMemo(() => {
    const totalCollateral = bnOrZero(totalCollateralFiat)
    if (totalCollateral.isZero()) return 0
    return bnOrZero(totalBorrowedFiat).div(totalCollateral).toNumber()
  }, [totalCollateralFiat, totalBorrowedFiat])

  const projectedLtvDecimal = useMemo(() => {
    if (bnOrZero(inputValue).isZero()) return undefined
    const totalCollateral = bnOrZero(totalCollateralFiat)
    const totalBorrowed = bnOrZero(totalBorrowedFiat)
    if (totalBorrowed.isZero()) return undefined
    const changeFiat = inputFiat
    const projectedCollateral = isAddMode
      ? totalCollateral.plus(changeFiat)
      : totalCollateral.minus(changeFiat)
    if (projectedCollateral.lte(0)) return 1
    return totalBorrowed.div(projectedCollateral).toNumber()
  }, [inputValue, totalCollateralFiat, totalBorrowedFiat, inputFiat, isAddMode])

  const hasActiveLoans = useMemo(() => bnOrZero(totalBorrowedFiat).gt(0), [totalBorrowedFiat])

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
              {translate(
                isAddMode
                  ? 'chainflipLending.collateral.add'
                  : 'chainflipLending.collateral.remove',
              )}
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

          {hasActiveLoans && (
            <LtvGauge currentLtv={currentLtvDecimal} projectedLtv={projectedLtvDecimal} />
          )}

          {isBelowMinimum && minimumUpdateCollateralAmountUsd && (
            <RawText fontSize='xs' color='red.500'>
              {translate('chainflipLending.collateral.minimumAmount', {
                amount: `$${minimumUpdateCollateralAmountUsd}`,
              })}
            </RawText>
          )}

          {!hasAvailableBalance && (
            <RawText fontSize='xs' color='yellow.500'>
              {translate(
                isAddMode
                  ? 'chainflipLending.collateral.noFreeBalance'
                  : 'chainflipLending.collateral.noRemovable',
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
