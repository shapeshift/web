import { Box, Button, CardBody, CardFooter, Checkbox, Flex, Stack, VStack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { ethChainId, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { BigAmount } from '@shapeshiftoss/utils'
import { useCallback, useMemo, useState } from 'react'
import type { NumberFormatValues } from 'react-number-format'
import { NumericFormat } from 'react-number-format'
import { useTranslate } from 'react-polyglot'

import { WithdrawMachineCtx } from './WithdrawMachineContext'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { ButtonWalletPredicate } from '@/components/ButtonWalletPredicate/ButtonWalletPredicate'
import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { SlideTransition } from '@/components/SlideTransition'
import { RawText } from '@/components/Text'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { useWalletSupportsChain } from '@/hooks/useWalletSupportsChain/useWalletSupportsChain'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { useChainflipMinimumSupply } from '@/pages/ChainflipLending/hooks/useChainflipMinimumSupply'
import { selectAccountIdsByAccountNumberAndChainId } from '@/state/slices/portfolioSlice/selectors'
import { allowedDecimalSeparators } from '@/state/slices/preferencesSlice/preferencesSlice'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type WithdrawInputProps = {
  assetId: AssetId
}

export const WithdrawInput = ({ assetId }: WithdrawInputProps) => {
  const translate = useTranslate()
  const wallet = useWallet().state.wallet
  const walletSupportsEth = useWalletSupportsChain(ethChainId, wallet)
  const {
    number: { localeParts },
  } = useLocaleFormatter()

  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const { accountNumber } = useChainflipLendingAccount()
  const accountIdsByAccountNumberAndChainId = useAppSelector(
    selectAccountIdsByAccountNumberAndChainId,
  )

  const actorRef = WithdrawMachineCtx.useActorRef()
  const supplyPositionCryptoBaseUnit = WithdrawMachineCtx.useSelector(
    s => s.context.supplyPositionCryptoBaseUnit,
  )

  const [withdrawAmountCryptoPrecision, setWithdrawAmountCryptoPrecision] = useState('')
  const [withdrawToWallet, setWithdrawToWallet] = useState(false)

  const chainId = useMemo(() => fromAssetId(assetId).chainId, [assetId])
  const walletSupportsAssetChain = useWalletSupportsChain(chainId, wallet)

  const poolChainAccountId = useMemo(() => {
    const byChainId = accountIdsByAccountNumberAndChainId[accountNumber]
    return byChainId?.[chainId]?.[0]
  }, [accountIdsByAccountNumberAndChainId, accountNumber, chainId])

  const availableCryptoPrecision = useMemo(
    () =>
      BigAmount.fromBaseUnit({
        value: supplyPositionCryptoBaseUnit,
        precision: asset?.precision ?? 0,
      }).toPrecision(),
    [supplyPositionCryptoBaseUnit, asset?.precision],
  )

  const { minSupply, isLoading: isMinSupplyLoading } = useChainflipMinimumSupply(assetId)

  const hasPosition = useMemo(
    () => bnOrZero(supplyPositionCryptoBaseUnit).gt(0),
    [supplyPositionCryptoBaseUnit],
  )

  const withdrawAddress = useMemo(
    () => (poolChainAccountId ? fromAccountId(poolChainAccountId).account : ''),
    [poolChainAccountId],
  )

  const isFullWithdrawalOnly = useMemo(() => {
    if (!minSupply) return false
    return bnOrZero(availableCryptoPrecision).lt(bnOrZero(minSupply).times(2))
  }, [availableCryptoPrecision, minSupply])

  const handleInputChange = useCallback((values: NumberFormatValues) => {
    setWithdrawAmountCryptoPrecision(values.value)
  }, [])

  const handleMaxClick = useCallback(() => {
    setWithdrawAmountCryptoPrecision(availableCryptoPrecision)
  }, [availableCryptoPrecision])

  const handleWithdrawToWalletChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setWithdrawToWallet(e.target.checked)
  }, [])

  const isFullWithdrawal = useMemo(
    () =>
      isFullWithdrawalOnly ||
      (bnOrZero(withdrawAmountCryptoPrecision).gt(0) &&
        bnOrZero(withdrawAmountCryptoPrecision).eq(availableCryptoPrecision)),
    [withdrawAmountCryptoPrecision, availableCryptoPrecision, isFullWithdrawalOnly],
  )

  const isBelowMinimum = useMemo(() => {
    if (!minSupply || isFullWithdrawal) return false
    const amount = bnOrZero(withdrawAmountCryptoPrecision)
    return amount.gt(0) && amount.lt(minSupply)
  }, [withdrawAmountCryptoPrecision, minSupply, isFullWithdrawal])

  const isRemainingBelowMinimum = useMemo(() => {
    if (!minSupply || isFullWithdrawal) return false
    const amount = bnOrZero(withdrawAmountCryptoPrecision)
    if (amount.isZero()) return false
    const remaining = bnOrZero(availableCryptoPrecision).minus(amount)
    return remaining.gt(0) && remaining.lt(minSupply)
  }, [withdrawAmountCryptoPrecision, availableCryptoPrecision, minSupply, isFullWithdrawal])

  const handleSubmit = useCallback(() => {
    if (!asset || !withdrawAddress) return
    const amountPrecision = isFullWithdrawalOnly
      ? availableCryptoPrecision
      : withdrawAmountCryptoPrecision
    const withdrawAmountCryptoBaseUnit = BigAmount.fromPrecision({
      value: amountPrecision,
      precision: asset.precision,
    }).toBaseUnit()
    actorRef.send({
      type: 'SUBMIT',
      withdrawAmountCryptoPrecision: amountPrecision,
      withdrawAmountCryptoBaseUnit,
      withdrawAddress,
      withdrawToWallet,
      isFullWithdrawal,
    })
  }, [
    actorRef,
    withdrawAmountCryptoPrecision,
    availableCryptoPrecision,
    isFullWithdrawalOnly,
    asset,
    withdrawAddress,
    withdrawToWallet,
    isFullWithdrawal,
  ])

  const isValidWallet = useMemo(
    () => Boolean(walletSupportsEth && walletSupportsAssetChain),
    [walletSupportsEth, walletSupportsAssetChain],
  )

  const isSubmitDisabled = useMemo(
    () =>
      isMinSupplyLoading ||
      (!isFullWithdrawalOnly && bnOrZero(withdrawAmountCryptoPrecision).isZero()) ||
      bnOrZero(withdrawAmountCryptoPrecision).gt(availableCryptoPrecision) ||
      isBelowMinimum ||
      isRemainingBelowMinimum,
    [
      isMinSupplyLoading,
      withdrawAmountCryptoPrecision,
      availableCryptoPrecision,
      isFullWithdrawalOnly,
      isBelowMinimum,
      isRemainingBelowMinimum,
    ],
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

          {hasPosition ? (
            <>
              <Stack spacing={1}>
                <RawText fontSize='sm' color='text.subtle'>
                  {translate('chainflipLending.withdraw.amount')}
                </RawText>
                {isFullWithdrawalOnly ? (
                  <HelperTooltip
                    label={translate('chainflipLending.withdraw.fullWithdrawalOnlyTooltip')}
                  >
                    <RawText fontSize='xl' fontWeight='bold' color='text.subtle' py={2}>
                      {availableCryptoPrecision} {asset.symbol}
                    </RawText>
                  </HelperTooltip>
                ) : (
                  <NumericFormat
                    inputMode='decimal'
                    valueIsNumericString={true}
                    decimalScale={asset.precision}
                    thousandSeparator={localeParts.group}
                    decimalSeparator={localeParts.decimal}
                    allowedDecimalSeparators={allowedDecimalSeparators}
                    allowNegative={false}
                    allowLeadingZeros={false}
                    value={withdrawAmountCryptoPrecision}
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
                )}
              </Stack>

              <Flex justifyContent='space-between' alignItems='center'>
                <HelperTooltip label={translate('chainflipLending.withdraw.availableTooltip')}>
                  <RawText fontSize='sm' color='text.subtle'>
                    {translate('chainflipLending.withdraw.available')}
                  </RawText>
                </HelperTooltip>
                <Flex alignItems='center' gap={2}>
                  <Amount.Crypto
                    value={availableCryptoPrecision}
                    symbol={asset.symbol}
                    fontSize='sm'
                    fontWeight='medium'
                  />
                  <Button size='xs' variant='ghost' colorScheme='blue' onClick={handleMaxClick}>
                    {translate('modals.send.sendForm.max')}
                  </Button>
                </Flex>
              </Flex>
              {isBelowMinimum && minSupply && (
                <RawText fontSize='sm' color='red.500'>
                  {translate('chainflipLending.withdraw.partialBelowMinimum', {
                    amount: `${bnOrZero(minSupply).decimalPlaces(2).toFixed()} ${asset.symbol}`,
                  })}
                </RawText>
              )}

              {isRemainingBelowMinimum && minSupply && (
                <RawText fontSize='sm' color='red.500'>
                  {translate('chainflipLending.withdraw.remainingBelowMinimum', {
                    amount: `${bnOrZero(minSupply).decimalPlaces(2).toFixed()} ${asset.symbol}`,
                  })}
                </RawText>
              )}

              <VStack spacing={2} align='stretch'>
                <RawText fontSize='xs' color='text.subtle'>
                  {translate('chainflipLending.withdraw.freeBalanceExplainer')}
                </RawText>
                <Checkbox
                  isChecked={withdrawToWallet}
                  onChange={handleWithdrawToWalletChange}
                  size='sm'
                  colorScheme='blue'
                >
                  <RawText fontSize='sm'>
                    {translate('chainflipLending.withdraw.alsoWithdrawToWallet')}
                  </RawText>
                </Checkbox>
                {withdrawToWallet && withdrawAddress && (
                  <Box bg='background.surface.raised.base' borderRadius='lg' px={3} py={2}>
                    <RawText fontSize='xs' color='text.subtle' mb={1}>
                      {translate('chainflipLending.withdraw.destinationAddress')}
                    </RawText>
                    <MiddleEllipsis value={withdrawAddress} />
                  </Box>
                )}
              </VStack>
            </>
          ) : (
            <RawText fontSize='sm' color='text.subtle' textAlign='center' py={4}>
              {translate('chainflipLending.withdraw.noPosition')}
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
        <ButtonWalletPredicate
          isValidWallet={isValidWallet}
          colorScheme='blue'
          size='lg'
          height={12}
          borderRadius='xl'
          width='full'
          fontWeight='bold'
          onClick={handleSubmit}
          isDisabled={isSubmitDisabled || !hasPosition}
        >
          {translate('chainflipLending.withdraw.withdrawAmount')}
        </ButtonWalletPredicate>
      </CardFooter>
    </SlideTransition>
  )
}
