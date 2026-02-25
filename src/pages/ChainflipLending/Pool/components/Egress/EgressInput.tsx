import {
  Button,
  CardBody,
  CardFooter,
  Flex,
  FormControl,
  FormHelperText,
  HStack,
  Input,
  Stack,
  VStack,
} from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { BigAmount } from '@shapeshiftoss/utils'
import { useCallback, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { NumberFormatValues } from 'react-number-format'
import { NumericFormat } from 'react-number-format'
import { useTranslate } from 'react-polyglot'

import { EgressMachineCtx } from './EgressMachineContext'

import { AccountDropdown } from '@/components/AccountDropdown/AccountDropdown'
import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { InlineCopyButton } from '@/components/InlineCopyButton'
import { SlideTransition } from '@/components/SlideTransition'
import { RawText } from '@/components/Text'
import { useIsSnapInstalled } from '@/hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { walletSupportsChain } from '@/hooks/useWalletSupportsChain/useWalletSupportsChain'
import { validateAddress } from '@/lib/address/validation'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import {
  selectAccountIdsByAccountNumberAndChainId,
  selectAccountIdsByChainId,
} from '@/state/slices/portfolioSlice/selectors'
import { allowedDecimalSeparators } from '@/state/slices/preferencesSlice/preferencesSlice'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const dropdownBoxProps = { width: 'full', p: 0, m: 0 }
const dropdownButtonProps = { width: 'full', variant: 'solid', height: '40px', px: 4 }

type EgressInputProps = {
  assetId: AssetId
}

type AddressFormValues = {
  manualAddress: string
}

export const EgressInput = ({ assetId }: EgressInputProps) => {
  const translate = useTranslate()
  const { wallet } = useWallet().state
  const { isSnapInstalled } = useIsSnapInstalled()
  const {
    number: { localeParts },
  } = useLocaleFormatter()

  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const actorRef = EgressMachineCtx.useActorRef()
  const freeBalanceCryptoBaseUnit = EgressMachineCtx.useSelector(
    s => s.context.freeBalanceCryptoBaseUnit,
  )

  const { accountNumber } = useChainflipLendingAccount()
  const accountIdsByAccountNumberAndChainId = useAppSelector(
    selectAccountIdsByAccountNumberAndChainId,
  )
  const accountIdsByChainId = useAppSelector(selectAccountIdsByChainId)

  const chainId = useMemo(() => fromAssetId(assetId).chainId, [assetId])

  const accountId = useMemo(() => {
    const byChainId = accountIdsByAccountNumberAndChainId[accountNumber]
    return byChainId?.[chainId]?.[0]
  }, [accountIdsByAccountNumberAndChainId, accountNumber, chainId])

  const walletSupportsAssetChain = useMemo(() => {
    const chainAccountIds = accountIdsByChainId[chainId] ?? []
    return walletSupportsChain({
      checkConnectedAccountIds: chainAccountIds,
      chainId,
      wallet,
      isSnapInstalled,
    })
  }, [accountIdsByChainId, chainId, wallet, isSnapInstalled])

  const defaultAddress = useMemo(
    () => (accountId ? fromAccountId(accountId).account : ''),
    [accountId],
  )

  const [inputValue, setInputValue] = useState('')
  const [destinationAddress, setDestinationAddress] = useState(defaultAddress)
  const [defaultAccountId, setDefaultAccountId] = useState<AccountId | undefined>(accountId)
  const [isCustomAddress, setIsCustomAddress] = useState(!walletSupportsAssetChain)

  const methods = useForm<AddressFormValues>({
    mode: 'onChange',
    reValidateMode: 'onChange',
  })
  const {
    register,
    formState: { errors },
    setValue,
    trigger,
  } = methods

  const availableCryptoPrecision = useMemo(
    () =>
      BigAmount.fromBaseUnit({
        value: freeBalanceCryptoBaseUnit,
        precision: asset?.precision ?? 0,
      }).toPrecision(),
    [freeBalanceCryptoBaseUnit, asset?.precision],
  )

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

  const handleSubmit = useCallback(() => {
    if (!asset) return
    const baseUnit = BigAmount.fromPrecision({
      value: inputValue || '0',
      precision: asset.precision,
    }).toBaseUnit()

    actorRef.send({
      type: 'SUBMIT',
      egressAmountCryptoPrecision: inputValue,
      egressAmountCryptoBaseUnit: baseUnit,
      destinationAddress,
    })
  }, [actorRef, inputValue, asset, destinationAddress])

  const isSubmitDisabled = useMemo(
    () =>
      bnOrZero(inputValue).isZero() ||
      bnOrZero(inputValue).gt(availableCryptoPrecision) ||
      !hasFreeBalance ||
      !destinationAddress.trim(),
    [inputValue, availableCryptoPrecision, hasFreeBalance, destinationAddress],
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
              {translate('chainflipLending.egress.amount')}
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
              label={translate('chainflipLending.deposit.freeBalanceTooltip', {
                asset: asset.symbol,
              })}
            >
              <RawText fontSize='sm' color='text.subtle'>
                {translate('chainflipLending.deposit.freeBalance')}
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

          <FormControl isInvalid={Boolean(errors.manualAddress)}>
            <HStack justifyContent='space-between' mb={2}>
              <RawText fontSize='sm' color='text.subtle'>
                {translate('chainflipLending.egress.destination')}
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
          {translate('chainflipLending.egress.title')}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
}
