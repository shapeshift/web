import {
  Avatar,
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Skeleton,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'
import { cosmosChainId, fromAccountId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import { memo, useCallback, useMemo, useState } from 'react'
import { TbSwitchVertical } from 'react-icons/tb'
import type { NumberFormatValues } from 'react-number-format'
import { NumericFormat } from 'react-number-format'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { WalletActions } from '@/context/WalletProvider/actions'
import { useDebounce } from '@/hooks/useDebounce/useDebounce'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { enterYield } from '@/lib/yieldxyz/api'
import {
  DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID,
  SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS,
  SHAPESHIFT_VALIDATOR_LOGO,
} from '@/lib/yieldxyz/constants'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'
import { GradientApy } from '@/pages/Yields/components/GradientApy'
import { YieldActionModal } from '@/pages/Yields/components/YieldActionModal'
import { useYieldProviders } from '@/react-queries/queries/yieldxyz/useYieldProviders'
import { useYieldValidators } from '@/react-queries/queries/yieldxyz/useYieldValidators'
import { allowedDecimalSeparators } from '@/state/slices/preferencesSlice/preferencesSlice'
import {
  selectAccountIdByAccountNumberAndChainId,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type YieldEnterModalProps = {
  isOpen: boolean
  onClose: () => void
  yieldItem: AugmentedYieldDto
  accountNumber?: number
}

const QUOTE_DEBOUNCE_MS = 500

const FONT_SIZE_THRESHOLDS = {
  SMALL: 10,
  MEDIUM: 14,
  LARGE: 22,
} as const

const getFontSizeByLength = (length: number): string => {
  if (length >= FONT_SIZE_THRESHOLDS.LARGE) return '24px'
  if (length >= FONT_SIZE_THRESHOLDS.MEDIUM) return '30px'
  if (length >= FONT_SIZE_THRESHOLDS.SMALL) return '38px'
  return '48px'
}

type BigAmountInputProps = {
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  [key: string]: unknown
}

const BigAmountInput = (props: BigAmountInputProps) => {
  const valueLength = useMemo(() => (props.value ? String(props.value).length : 0), [props.value])
  const fontSize = useMemo(() => getFontSizeByLength(valueLength), [valueLength])

  return (
    <Input
      size='lg'
      fontSize={fontSize}
      lineHeight={fontSize}
      fontWeight='medium'
      textAlign='center'
      border='none'
      borderRadius='lg'
      bg='transparent'
      variant='unstyled'
      color={props.value ? 'text.base' : 'text.subtle'}
      {...props}
    />
  )
}

const YieldEnterModalSkeleton = memo(() => (
  <Flex direction='column' gap={4} align='center' py={8}>
    <Skeleton height='48px' width='200px' borderRadius='lg' />
    <Skeleton height='20px' width='100px' borderRadius='lg' />
  </Flex>
))

export const YieldEnterModal = memo(
  ({ isOpen, onClose, yieldItem, accountNumber = 0 }: YieldEnterModalProps) => {
    const translate = useTranslate()
    const { state: walletState, dispatch } = useWallet()
    const wallet = walletState.wallet
    const isConnected = useMemo(() => Boolean(walletState.walletInfo), [walletState.walletInfo])
    const {
      number: { localeParts, toCrypto, toFiat },
    } = useLocaleFormatter()

    const modalBg = useColorModeValue('white', 'gray.800')
    const borderColor = useColorModeValue('gray.200', 'gray.700')
    const statsBg = useColorModeValue('gray.50', 'whiteAlpha.50')
    const statsBorderColor = useColorModeValue('gray.100', 'whiteAlpha.100')
    const percentButtonBg = useColorModeValue('gray.100', 'whiteAlpha.100')
    const percentButtonHoverBg = useColorModeValue('gray.200', 'whiteAlpha.200')
    const percentButtonActiveBg = useColorModeValue('blue.100', 'blue.800')
    const percentButtonActiveColor = useColorModeValue('blue.600', 'blue.200')

    const [cryptoAmount, setCryptoAmount] = useState('')
    const [isFiat, setIsFiat] = useState(false)
    const [isActionModalOpen, setIsActionModalOpen] = useState(false)

    const debouncedAmount = useDebounce(cryptoAmount, QUOTE_DEBOUNCE_MS)

    const { chainId } = yieldItem

    const shouldFetchValidators = useMemo(
      () =>
        yieldItem.mechanics.type === 'staking' && yieldItem.mechanics.requiresValidatorSelection,
      [yieldItem.mechanics.type, yieldItem.mechanics.requiresValidatorSelection],
    )
    const { data: validators, isLoading: isValidatorsLoading } = useYieldValidators(
      yieldItem.id,
      shouldFetchValidators,
    )

    const selectedValidatorAddress = useMemo(() => {
      if (chainId && DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID[chainId]) {
        return DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID[chainId]
      }
      return validators?.[0]?.address
    }, [chainId, validators])

    const { data: providers } = useYieldProviders()

    const isStaking = yieldItem.mechanics.type === 'staking'

    const selectedValidatorMetadata = useMemo(() => {
      if (!isStaking || !selectedValidatorAddress) return null
      const found = validators?.find(v => v.address === selectedValidatorAddress)
      if (found) return found
      if (selectedValidatorAddress === SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS) {
        return {
          name: 'ShapeShift DAO',
          logoURI: SHAPESHIFT_VALIDATOR_LOGO,
          address: selectedValidatorAddress,
        }
      }
      return null
    }, [isStaking, selectedValidatorAddress, validators])

    const providerMetadata = useMemo(() => {
      if (!providers) return null
      return providers[yieldItem.providerId]
    }, [providers, yieldItem.providerId])

    const accountId = useAppSelector(state => {
      if (!chainId) return undefined
      const accountIdsByNumberAndChain = selectAccountIdByAccountNumberAndChainId(state)
      return accountIdsByNumberAndChain[accountNumber]?.[chainId]
    })

    const userAddress = useMemo(
      () => (accountId ? fromAccountId(accountId).account : ''),
      [accountId],
    )

    const inputToken = yieldItem.inputTokens[0]
    const inputTokenAssetId = inputToken?.assetId
    const inputSymbol = inputToken?.symbol ?? ''
    const inputPrecision = inputToken?.decimals ?? 18

    const inputTokenBalance = useAppSelector(state =>
      inputTokenAssetId && accountId
        ? selectPortfolioCryptoPrecisionBalanceByFilter(state, {
            assetId: inputTokenAssetId,
            accountId,
          })
        : '0',
    )

    const marketData = useAppSelector(state =>
      selectMarketDataByAssetIdUserCurrency(state, inputTokenAssetId ?? ''),
    )

    const minDeposit = yieldItem.mechanics?.entryLimits?.minimum

    const isBelowMinimum = useMemo(() => {
      if (!cryptoAmount || !minDeposit) return false
      return bnOrZero(cryptoAmount).lt(minDeposit)
    }, [cryptoAmount, minDeposit])

    const txArguments = useMemo(() => {
      if (!yieldItem || !userAddress || !chainId || !debouncedAmount) return null
      if (!bnOrZero(debouncedAmount).gt(0)) return null

      const fields = yieldItem.mechanics.arguments.enter.fields
      const fieldNames = new Set(fields.map(field => field.name))
      const args: Record<string, unknown> = { amount: debouncedAmount }

      if (fieldNames.has('receiverAddress')) {
        args.receiverAddress = userAddress
      }

      if (fieldNames.has('validatorAddress') && chainId) {
        args.validatorAddress =
          selectedValidatorAddress || DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID[chainId]
      }

      if (fieldNames.has('cosmosPubKey') && chainId === cosmosChainId) {
        args.cosmosPubKey = userAddress
      }

      return args
    }, [yieldItem, userAddress, chainId, debouncedAmount, selectedValidatorAddress])

    const { isLoading: isQuoteLoading, isFetching: isQuoteFetching } = useQuery({
      queryKey: ['yieldxyz', 'quote', 'enter', yieldItem.id, userAddress, txArguments],
      queryFn: () => {
        if (!txArguments || !userAddress || !yieldItem.id) throw new Error('Missing arguments')
        return enterYield({ yieldId: yieldItem.id, address: userAddress, arguments: txArguments })
      },
      enabled:
        !!txArguments && !!wallet && !!accountId && isOpen && bnOrZero(debouncedAmount).gt(0),
      staleTime: 30_000,
      gcTime: 60_000,
      retry: false,
    })

    const isLoading = isValidatorsLoading
    const isQuoteActive = isQuoteLoading || isQuoteFetching

    const fiatAmount = useMemo(
      () => bnOrZero(cryptoAmount).times(marketData?.price ?? 0),
      [cryptoAmount, marketData?.price],
    )

    const balanceFiat = useMemo(
      () => bnOrZero(inputTokenBalance).times(marketData?.price ?? 0),
      [inputTokenBalance, marketData?.price],
    )

    const apy = useMemo(() => bnOrZero(yieldItem.rewardRate.total), [yieldItem.rewardRate.total])
    const apyDisplay = useMemo(() => `${apy.times(100).toFixed(2)}%`, [apy])

    const estimatedYearlyEarnings = useMemo(
      () => bnOrZero(cryptoAmount).times(apy),
      [cryptoAmount, apy],
    )

    const estimatedYearlyEarningsFiat = useMemo(
      () => estimatedYearlyEarnings.times(marketData?.price ?? 0),
      [estimatedYearlyEarnings, marketData?.price],
    )

    const hasAmount = bnOrZero(cryptoAmount).gt(0)

    const displayPlaceholder = useMemo(
      () => (isFiat ? `${localeParts.prefix}0` : '0'),
      [isFiat, localeParts.prefix],
    )

    const handleInputChange = useCallback(
      (values: NumberFormatValues) => {
        setSelectedPercent(null)
        if (isFiat) {
          const crypto = bnOrZero(values.value)
            .div(marketData?.price ?? 1)
            .toFixed()
          setCryptoAmount(crypto)
        } else {
          setCryptoAmount(values.value)
        }
      },
      [isFiat, marketData?.price],
    )

    const displayValue = useMemo(() => {
      if (isFiat) {
        return fiatAmount.toFixed(2)
      }
      return cryptoAmount
    }, [isFiat, fiatAmount, cryptoAmount])

    const toggleIsFiat = useCallback(() => setIsFiat(prev => !prev), [])

    const [selectedPercent, setSelectedPercent] = useState<number | null>(null)

    const handlePercentClick = useCallback(
      (percent: number) => {
        const percentAmount = bnOrZero(inputTokenBalance).times(percent).toFixed()
        setCryptoAmount(percentAmount)
        setSelectedPercent(percent)
      },
      [inputTokenBalance],
    )

    const handleEnterClick = useCallback(() => {
      setIsActionModalOpen(true)
    }, [])

    const handleConnectWallet = useCallback(
      () => dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true }),
      [dispatch],
    )

    const handleActionModalClose = useCallback(() => {
      setIsActionModalOpen(false)
    }, [])

    const handleModalClose = useCallback(() => {
      setCryptoAmount('')
      setSelectedPercent(null)
      setIsFiat(false)
      onClose()
    }, [onClose])

    const enterButtonDisabled = useMemo(
      () =>
        isConnected && (isLoading || !yieldItem.status.enter || !cryptoAmount || isBelowMinimum),
      [isConnected, isLoading, yieldItem.status.enter, cryptoAmount, isBelowMinimum],
    )

    const enterButtonText = useMemo(() => {
      if (!isConnected) return translate('common.connectWallet')
      if (isQuoteActive) return translate('yieldXYZ.loadingQuote')
      return translate('yieldXYZ.stakeAsset', { asset: inputSymbol })
    }, [isConnected, isQuoteActive, translate, inputSymbol])

    const handleEnterButtonClick = useMemo(
      () => (isConnected ? handleEnterClick : handleConnectWallet),
      [isConnected, handleEnterClick, handleConnectWallet],
    )

    const modalTitle = useMemo(
      () => translate('yieldXYZ.stakeAsset', { asset: inputSymbol }),
      [translate, inputSymbol],
    )

    const percentButtons = useMemo(
      () => (
        <HStack spacing={2} justify='center' width='full'>
          {[0.25, 0.5, 0.75, 1].map(percent => {
            const isSelected = selectedPercent === percent
            return (
              <Button
                key={percent}
                size='sm'
                variant='ghost'
                bg={isSelected ? percentButtonActiveBg : percentButtonBg}
                color={isSelected ? percentButtonActiveColor : 'text.subtle'}
                _hover={{ bg: isSelected ? percentButtonActiveBg : percentButtonHoverBg }}
                onClick={() => handlePercentClick(percent)}
                borderRadius='full'
                px={4}
                fontWeight='medium'
              >
                {percent === 1 ? 'Max' : `${percent * 100}%`}
              </Button>
            )
          })}
        </HStack>
      ),
      [
        selectedPercent,
        percentButtonActiveBg,
        percentButtonBg,
        percentButtonActiveColor,
        percentButtonHoverBg,
        handlePercentClick,
      ],
    )

    const statsContent = useMemo(
      () => (
        <Box bg={statsBg} borderRadius='xl' p={4} border='1px solid' borderColor={statsBorderColor}>
          <Flex justify='space-between' align='center'>
            <Text fontSize='sm' color='text.subtle'>
              {translate('yieldXYZ.currentApy')}
            </Text>
            <GradientApy fontSize='sm' fontWeight='bold'>
              {apyDisplay}
            </GradientApy>
          </Flex>
          {hasAmount && (
            <Flex justify='space-between' align='center' mt={3}>
              <Text fontSize='sm' color='text.subtle'>
                {translate('yieldXYZ.estYearlyEarnings')}
              </Text>
              <Flex direction='column' align='flex-end'>
                <GradientApy fontSize='sm' fontWeight='bold'>
                  {estimatedYearlyEarnings.decimalPlaces(4).toString()} {inputSymbol}
                </GradientApy>
                <Text fontSize='xs' color='text.subtle'>
                  <Amount.Fiat value={estimatedYearlyEarningsFiat.toString()} />
                </Text>
              </Flex>
            </Flex>
          )}
          {isStaking && selectedValidatorMetadata && (
            <Flex justify='space-between' align='center' mt={3}>
              <Text fontSize='sm' color='text.subtle'>
                {translate('yieldXYZ.validator')}
              </Text>
              <Flex align='center' gap={2}>
                <Avatar
                  size='xs'
                  src={selectedValidatorMetadata.logoURI}
                  name={selectedValidatorMetadata.name}
                />
                <Text fontSize='sm' fontWeight='medium'>
                  {selectedValidatorMetadata.name}
                </Text>
              </Flex>
            </Flex>
          )}
          {!isStaking && providerMetadata && (
            <Flex justify='space-between' align='center' mt={3}>
              <Text fontSize='sm' color='text.subtle'>
                {translate('yieldXYZ.provider')}
              </Text>
              <Flex align='center' gap={2}>
                <Avatar size='xs' src={providerMetadata.logoURI} name={providerMetadata.name} />
                <Text fontSize='sm' fontWeight='medium'>
                  {providerMetadata.name}
                </Text>
              </Flex>
            </Flex>
          )}
          {minDeposit && bnOrZero(minDeposit).gt(0) && (
            <Flex justify='space-between' align='center' mt={3}>
              <Text fontSize='sm' color='text.subtle'>
                {translate('yieldXYZ.minDeposit')}
              </Text>
              <Text
                fontSize='sm'
                color={isBelowMinimum ? 'red.500' : 'text.base'}
                fontWeight='medium'
              >
                {minDeposit} {inputSymbol}
              </Text>
            </Flex>
          )}
        </Box>
      ),
      [
        statsBg,
        statsBorderColor,
        translate,
        apyDisplay,
        hasAmount,
        estimatedYearlyEarnings,
        inputSymbol,
        estimatedYearlyEarningsFiat,
        isStaking,
        selectedValidatorMetadata,
        providerMetadata,
        minDeposit,
        isBelowMinimum,
      ],
    )

    const balanceDisplay = useMemo(() => {
      const cryptoDisplay = toCrypto(bnOrZero(inputTokenBalance), inputSymbol)
      const fiatDisplay = toFiat(balanceFiat.toString())
      return `${translate('common.balance')}: ${cryptoDisplay} (${fiatDisplay})`
    }, [inputTokenBalance, inputSymbol, balanceFiat, translate, toCrypto, toFiat])

    const inputContent = useMemo(() => {
      if (isLoading) return <YieldEnterModalSkeleton />

      return (
        <Flex direction='column' align='center' py={6}>
          {inputTokenAssetId && <AssetIcon assetId={inputTokenAssetId} size='md' mb={4} />}
          <NumericFormat
            customInput={BigAmountInput}
            valueIsNumericString={true}
            decimalScale={isFiat ? 2 : inputPrecision}
            inputMode='decimal'
            thousandSeparator={localeParts.group}
            decimalSeparator={localeParts.decimal}
            allowedDecimalSeparators={allowedDecimalSeparators}
            allowNegative={false}
            allowLeadingZeros={false}
            value={displayValue}
            placeholder={displayPlaceholder}
            prefix={isFiat ? localeParts.prefix : ''}
            suffix={isFiat ? '' : ` ${inputSymbol}`}
            onValueChange={handleInputChange}
          />
          <HStack spacing={2} mt={2} onClick={toggleIsFiat} cursor='pointer'>
            <Text fontSize='sm' color='text.subtle'>
              {isFiat ? (
                <Amount.Crypto value={cryptoAmount || '0'} symbol={inputSymbol} />
              ) : (
                <Amount.Fiat value={fiatAmount.toFixed(2)} />
              )}
            </Text>
            <Icon as={TbSwitchVertical} fontSize='sm' color='text.subtle' />
          </HStack>
          <Text fontSize='xs' color='text.subtle' mt={1}>
            {balanceDisplay}
          </Text>
        </Flex>
      )
    }, [
      isLoading,
      inputTokenAssetId,
      isFiat,
      inputPrecision,
      localeParts,
      displayValue,
      displayPlaceholder,
      inputSymbol,
      handleInputChange,
      toggleIsFiat,
      cryptoAmount,
      fiatAmount,
      balanceDisplay,
    ])

    return (
      <>
        <Modal isOpen={isOpen} onClose={handleModalClose} isCentered size='md'>
          <ModalOverlay />
          <ModalContent bg={modalBg} borderRadius='2xl'>
            <ModalHeader
              borderBottomWidth='1px'
              borderColor={borderColor}
              textAlign='center'
              fontSize='lg'
              fontWeight='semibold'
            >
              {modalTitle}
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody py={4}>
              <Flex direction='column' gap={4}>
                {inputContent}
                {percentButtons}
                {statsContent}
                <Button
                  colorScheme='blue'
                  size='lg'
                  width='full'
                  height='56px'
                  fontSize='lg'
                  fontWeight='semibold'
                  borderRadius='xl'
                  isDisabled={enterButtonDisabled}
                  isLoading={isQuoteActive && hasAmount}
                  loadingText={translate('yieldXYZ.loadingQuote')}
                  onClick={handleEnterButtonClick}
                >
                  {enterButtonText}
                </Button>
              </Flex>
            </ModalBody>
          </ModalContent>
        </Modal>
        <YieldActionModal
          isOpen={isActionModalOpen}
          onClose={handleActionModalClose}
          yieldItem={yieldItem}
          action='enter'
          amount={cryptoAmount}
          assetSymbol={inputSymbol}
          validatorAddress={selectedValidatorAddress}
        />
      </>
    )
  },
)
