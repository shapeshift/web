import {
  Button,
  CardBody,
  CardFooter,
  Checkbox,
  Flex,
  FormControl,
  FormHelperText,
  HStack,
  Input,
  Stack,
  VStack,
} from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { ethChainId, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { BigAmount } from '@shapeshiftoss/utils'
import { useCallback, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { NumberFormatValues } from 'react-number-format'
import { NumericFormat } from 'react-number-format'
import { useTranslate } from 'react-polyglot'

import { WithdrawMachineCtx } from './WithdrawMachineContext'

import { AccountDropdown } from '@/components/AccountDropdown/AccountDropdown'
import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { ButtonWalletPredicate } from '@/components/ButtonWalletPredicate/ButtonWalletPredicate'
import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { InlineCopyButton } from '@/components/InlineCopyButton'
import { SlideTransition } from '@/components/SlideTransition'
import { RawText } from '@/components/Text'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { useWalletSupportsChain } from '@/hooks/useWalletSupportsChain/useWalletSupportsChain'
import { validateAddress } from '@/lib/address/validation'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { useChainflipMinimumSupply } from '@/pages/ChainflipLending/hooks/useChainflipMinimumSupply'
import { selectAccountIdsByAccountNumberAndChainId } from '@/state/slices/portfolioSlice/selectors'
import { allowedDecimalSeparators } from '@/state/slices/preferencesSlice/preferencesSlice'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const dropdownBoxProps = { width: 'full', p: 0, m: 0 }
const dropdownButtonProps = { width: 'full', variant: 'solid', height: '40px', px: 4 }

type AddressFormValues = {
  manualAddress: string
}

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

  const defaultAddress = useMemo(
    () => (poolChainAccountId ? fromAccountId(poolChainAccountId).account : ''),
    [poolChainAccountId],
  )

  const [destinationAddress, setDestinationAddress] = useState(defaultAddress)
  const [defaultAccountId, setDefaultAccountId] = useState<AccountId | undefined>(
    poolChainAccountId,
  )
  const [isCustomAddress, setIsCustomAddress] = useState(!walletSupportsAssetChain)

  const {
    register,
    formState: { errors },
    setValue,
    trigger,
  } = useForm<AddressFormValues>({
    mode: 'onChange',
    reValidateMode: 'onChange',
  })

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

  const handleWithdrawToWalletChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const checked = e.target.checked
      setWithdrawToWallet(checked)
      if (checked) {
        setDestinationAddress(defaultAddress)
        setIsCustomAddress(!walletSupportsAssetChain)
      }
    },
    [defaultAddress, walletSupportsAssetChain],
  )

  const handleAccountChange = useCallback((newAccountId: string) => {
    const address = fromAccountId(newAccountId).account
    setDefaultAccountId(newAccountId)
    setDestinationAddress(address)
  }, [])

  const handleToggleCustomAddress = useCallback(() => {
    if (!walletSupportsAssetChain) return
    setDestinationAddress(isCustomAddress ? defaultAddress : '')
    setIsCustomAddress(prev => !prev)
  }, [walletSupportsAssetChain, isCustomAddress, defaultAddress])

  const validateChainAddress = useCallback(
    async (address: string) => {
      if (!address) {
        setDestinationAddress('')
        return true
      }
      const isValid = await validateAddress({ maybeAddress: address, chainId })
      if (!isValid) {
        setDestinationAddress('')
        return translate('common.invalidAddress')
      }
      setDestinationAddress(address)
      return true
    },
    [chainId, translate],
  )

  const handleManualInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setValue('manualAddress', newValue, { shouldValidate: true })
      await trigger('manualAddress')
    },
    [setValue, trigger],
  )

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
    if (!asset) return
    const withdrawAddress = withdrawToWallet ? destinationAddress : defaultAddress
    if (!withdrawAddress) return
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
    defaultAddress,
    destinationAddress,
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
      isRemainingBelowMinimum ||
      (withdrawToWallet && !destinationAddress.trim()),
    [
      isMinSupplyLoading,
      withdrawAmountCryptoPrecision,
      availableCryptoPrecision,
      isFullWithdrawalOnly,
      isBelowMinimum,
      isRemainingBelowMinimum,
      withdrawToWallet,
      destinationAddress,
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
                {withdrawToWallet && (
                  <FormControl isInvalid={Boolean(errors.manualAddress)}>
                    <HStack justifyContent='space-between' mb={2}>
                      <RawText fontSize='sm' color='text.subtle'>
                        {translate('chainflipLending.withdraw.destinationAddress')}
                      </RawText>
                      {walletSupportsAssetChain && (
                        <Button
                          fontSize='xs'
                          variant='link'
                          color='text.link'
                          onClick={handleToggleCustomAddress}
                        >
                          {isCustomAddress
                            ? translate('chainflipLending.deposit.refundAddress.useWalletAddress')
                            : translate('chainflipLending.deposit.refundAddress.useCustomAddress')}
                        </Button>
                      )}
                    </HStack>
                    {isCustomAddress ? (
                      <Input
                        {...register('manualAddress', {
                          required: true,
                          validate: { isValidAddress: validateChainAddress },
                        })}
                        placeholder={translate('common.enterAddress')}
                        autoComplete='off'
                        onChange={handleManualInputChange}
                        size='sm'
                        variant='filled'
                      />
                    ) : (
                      <InlineCopyButton value={destinationAddress}>
                        <AccountDropdown
                          assetId={assetId}
                          onChange={handleAccountChange}
                          boxProps={dropdownBoxProps}
                          buttonProps={dropdownButtonProps}
                          defaultAccountId={defaultAccountId}
                        />
                      </InlineCopyButton>
                    )}
                    {errors.manualAddress && (
                      <FormHelperText color='red.500'>
                        {errors.manualAddress.message as string}
                      </FormHelperText>
                    )}
                  </FormControl>
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
