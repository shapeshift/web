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
import type { Asset } from '@shapeshiftoss/types'
import { BigAmount } from '@shapeshiftoss/utils'
import { useCallback, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { NumberFormatValues } from 'react-number-format'
import { NumericFormat } from 'react-number-format'
import { useTranslate } from 'react-polyglot'

import { EgressMachineCtx } from './EgressMachineContext'

import { AccountDropdown } from '@/components/AccountDropdown/AccountDropdown'
import { Amount } from '@/components/Amount/Amount'
import { TradeAssetSelect } from '@/components/AssetSelection/AssetSelection'
import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { InlineCopyButton } from '@/components/InlineCopyButton'
import { SlideTransition } from '@/components/SlideTransition'
import { RawText } from '@/components/Text'
import { useIsSnapInstalled } from '@/hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { useModal } from '@/hooks/useModal/useModal'
import { useToggle } from '@/hooks/useToggle/useToggle'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { walletSupportsChain } from '@/hooks/useWalletSupportsChain/useWalletSupportsChain'
import { validateAddress } from '@/lib/address/validation'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { CHAINFLIP_LENDING_ASSET_BY_ASSET_ID } from '@/lib/chainflip/constants'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { selectMarketDataByAssetIdUserCurrency } from '@/state/slices/marketDataSlice/selectors'
import {
  selectAccountIdsByAccountNumberAndChainId,
  selectAccountIdsByChainId,
} from '@/state/slices/portfolioSlice/selectors'
import { allowedDecimalSeparators } from '@/state/slices/preferencesSlice/preferencesSlice'
import { selectAssetById, selectAssets } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const dropdownBoxProps = { width: 'full', p: 0, m: 0 }
const dropdownButtonProps = { width: 'full', variant: 'solid', height: '40px', px: 4 }

type EgressInputProps = {
  assetId: AssetId
  onAssetChange: (assetId: AssetId) => void
}

type AddressFormValues = {
  manualAddress: string
}

export const EgressInput = ({ assetId, onAssetChange }: EgressInputProps) => {
  const translate = useTranslate()
  const { wallet } = useWallet().state
  const { isSnapInstalled } = useIsSnapInstalled()
  const {
    number: { localeParts },
  } = useLocaleFormatter()

  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataByAssetIdUserCurrency(state, assetId))

  const actorRef = EgressMachineCtx.useActorRef()
  const freeBalanceCryptoBaseUnit = EgressMachineCtx.useSelector(
    s => s.context.freeBalanceCryptoBaseUnit,
  )
  const savedEgressAmount = EgressMachineCtx.useSelector(s => s.context.egressAmountCryptoPrecision)

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

  const [isFiat, toggleIsFiat] = useToggle(false)
  const [inputValue, setInputValue] = useState(savedEgressAmount || '')
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

  const availableFiat = useMemo(() => {
    if (!marketData?.price) return undefined
    return bnOrZero(availableCryptoPrecision).times(marketData.price).toFixed(2)
  }, [availableCryptoPrecision, marketData?.price])

  const fiatAmount = useMemo(() => {
    if (!marketData?.price) return '0'
    return bnOrZero(inputValue).times(marketData.price).toFixed()
  }, [inputValue, marketData?.price])

  const displayInputValue = useMemo(() => {
    if (isFiat) return fiatAmount === '0' ? '' : fiatAmount
    return inputValue
  }, [isFiat, fiatAmount, inputValue])

  const assetIds = useMemo(() => Object.keys(CHAINFLIP_LENDING_ASSET_BY_ASSET_ID) as AssetId[], [])

  const assets = useAppSelector(selectAssets)

  const lendingAssets = useMemo(() => {
    return assetIds.reduce<Asset[]>((acc, assetId) => {
      const asset = assets[assetId]
      if (asset) acc.push(asset)
      return acc
    }, [])
  }, [assetIds, assets])

  const buyAssetSearch = useModal('buyAssetSearch')

  const handleAssetClick = useCallback(() => {
    buyAssetSearch.open({
      onAssetClick: (asset: Asset) => onAssetChange(asset.assetId),
      title: 'chainflipLending.egress.title',
      assets: lendingAssets,
    })
  }, [buyAssetSearch, onAssetChange, lendingAssets])

  const handleAssetChange = useCallback(
    (asset: Asset) => onAssetChange(asset.assetId),
    [onAssetChange],
  )

  const handleInputChange = useCallback(
    (values: NumberFormatValues) => {
      if (isFiat) {
        const cryptoAmount =
          values.value && marketData?.price
            ? bnOrZero(values.value)
                .div(marketData.price)
                .decimalPlaces(asset?.precision ?? 18, 1)
                .toFixed()
            : ''
        setInputValue(cryptoAmount)
      } else {
        setInputValue(values.value)
      }
    },
    [isFiat, marketData?.price, asset?.precision],
  )

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
    const walletAddress = defaultAccountId ? fromAccountId(defaultAccountId).account : ''
    setDestinationAddress(isCustomAddress ? walletAddress : '')
    setIsCustomAddress(prev => !prev)
  }, [walletSupportsAssetChain, isCustomAddress, defaultAccountId])

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

  const handleSubmit = useCallback(async () => {
    if (!asset) return
    if (isCustomAddress) {
      const isValid = await trigger('manualAddress')
      if (!isValid) return
    }
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
  }, [actorRef, inputValue, asset, destinationAddress, isCustomAddress, trigger])

  const isSubmitDisabled = useMemo(
    () =>
      bnOrZero(inputValue).isZero() ||
      bnOrZero(inputValue).gt(availableCryptoPrecision) ||
      !hasFreeBalance ||
      !destinationAddress.trim() ||
      Boolean(isCustomAddress && errors.manualAddress),
    [
      inputValue,
      availableCryptoPrecision,
      hasFreeBalance,
      destinationAddress,
      isCustomAddress,
      errors.manualAddress,
    ],
  )

  if (!asset) return null

  return (
    <SlideTransition>
      <CardBody px={6} py={4}>
        <VStack spacing={4} align='stretch'>
          <TradeAssetSelect
            assetId={assetId}
            assetIds={assetIds}
            onAssetClick={handleAssetClick}
            onAssetChange={handleAssetChange}
            onlyConnectedChains={false}
            px={0}
            mb={0}
          />

          <Stack spacing={1}>
            <RawText fontSize='sm' color='text.subtle'>
              {translate('chainflipLending.egress.amount')}
            </RawText>
            <Flex alignItems='center' gap={2}>
              <NumericFormat
                data-testid='chainflip-egress-amount-input'
                inputMode='decimal'
                valueIsNumericString={true}
                decimalScale={isFiat ? 2 : asset.precision}
                thousandSeparator={localeParts.group}
                decimalSeparator={localeParts.decimal}
                allowedDecimalSeparators={allowedDecimalSeparators}
                allowNegative={false}
                allowLeadingZeros={false}
                value={displayInputValue}
                placeholder='0.00'
                prefix={isFiat ? localeParts.prefix : ''}
                suffix={isFiat ? localeParts.postfix : ''}
                onValueChange={handleInputChange}
                style={{
                  flex: 1,
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  padding: '0.5rem 0',
                }}
              />
              {!isFiat && (
                <RawText fontSize='lg' fontWeight='bold' color='text.subtle'>
                  {asset.symbol}
                </RawText>
              )}
            </Flex>
            {marketData?.price && (
              <Button
                variant='link'
                size='xs'
                color='text.subtle'
                fontWeight='medium'
                onClick={toggleIsFiat}
                alignSelf='flex-start'
                px={0}
              >
                {isFiat ? (
                  <Amount.Crypto value={inputValue || '0'} symbol={asset.symbol} fontSize='xs' />
                ) : (
                  <Amount.Fiat value={fiatAmount} prefix='≈' fontSize='xs' />
                )}
              </Button>
            )}
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
              <VStack spacing={0} align='flex-end'>
                {availableFiat !== undefined && (
                  <Amount.Fiat value={availableFiat} fontSize='sm' fontWeight='medium' />
                )}
                <Amount.Crypto
                  value={availableCryptoPrecision}
                  symbol={asset.symbol}
                  fontSize='xs'
                  color='text.subtle'
                />
              </VStack>
              <Button
                data-testid='chainflip-egress-max'
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
                  data-testid='chainflip-egress-toggle-destination'
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
                data-testid='chainflip-egress-custom-address-input'
                {...register('manualAddress', {
                  required: translate('common.addressRequired'),
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
              {translate('chainflipLending.egress.noFreeBalance')}
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
          data-testid='chainflip-egress-submit'
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
