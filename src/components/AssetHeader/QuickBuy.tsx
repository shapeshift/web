import { WarningIcon } from '@chakra-ui/icons'
import {
  Alert,
  AlertIcon,
  Button,
  CloseButton,
  Flex,
  HStack,
  Skeleton,
  SkeletonCircle,
  Stack,
  Text,
  useToast,
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { bn } from '@shapeshiftoss/utils'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { TbCheck, TbX } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
import { AnimatedCheck } from '@/components/AnimatedCheck'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import {
  selectMarketDataByAssetIdUserCurrency,
  selectUserCurrencyToUsdRate,
} from '@/state/slices/marketDataSlice/selectors'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import {
  selectAssetById,
  selectFeeAssetById,
  selectPortfolioCryptoPrecisionBalanceByFilter,
  selectPortfolioUserCurrencyBalanceByAssetId,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export type QuickBuyState = 'idle' | 'confirming' | 'loading' | 'success' | 'error'

type QuickBuyProps = {
  assetId: AssetId
  onEditAmounts: () => void
}

// Icon components
const CheckIcon = <TbCheck />
const CancelIcon = <TbX />

export const QuickBuy: React.FC<QuickBuyProps> = ({ assetId, onEditAmounts }) => {
  const translate = useTranslate()
  const toast = useToast()
  const { number } = useLocaleFormatter()

  const [state, setState] = useState<QuickBuyState>('error')
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [tokenAmount, setTokenAmount] = useState<string | null>(null)

  // Selectors
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const feeAsset = useAppSelector(state => selectFeeAssetById(state, assetId))
  const quickBuyPreferences = useAppSelector(preferences.selectors.selectQuickBuyPreferences)
  const userCurrencyToUsdRate = useAppSelector(selectUserCurrencyToUsdRate)
  const filter = useMemo(() => ({ assetId: feeAsset?.assetId }), [feeAsset?.assetId])
  const feeAssetBalanceCryptoPrecision = useAppSelector(s =>
    selectPortfolioCryptoPrecisionBalanceByFilter(s, filter),
  )
  const feeAssetBalanceUserCurrency = useAppSelector(
    state => selectPortfolioUserCurrencyBalanceByAssetId(state, filter) ?? '0',
  )
  const assetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, assetId),
  )

  // Computed values
  const isInsufficientBalance = useMemo(() => {
    if (!feeAssetBalanceUserCurrency || !selectedAmount || !userCurrencyToUsdRate) return false
    return bn(feeAssetBalanceUserCurrency).lt(selectedAmount)
  }, [feeAssetBalanceUserCurrency, selectedAmount, userCurrencyToUsdRate])

  const estimatedTokenAmount = useMemo(() => {
    if (!selectedAmount || !assetMarketData?.price) return null
    const tokenAmountInUserCurrency = bn(selectedAmount).dividedBy(bn(assetMarketData.price))
    return tokenAmountInUserCurrency.toString()
  }, [selectedAmount, assetMarketData?.price])

  // Handlers
  const handleAmountClick = useCallback((amount: number) => {
    setSelectedAmount(amount)
    setState('confirming')
  }, [])

  const handleCancel = useCallback(() => {
    setState('idle')
    setSelectedAmount(null)
    setTokenAmount(null)
  }, [])

  const handleConfirm = useCallback(async () => {
    if (!selectedAmount) return

    if (isInsufficientBalance) {
      toast({
        title: translate('trade.errors.insufficientFunds'),
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    setState('loading')

    try {
      // TODO: Implement actual transaction execution using discovered trade logic
      // For now, simulate success after 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000))

      setState('success')

      // Reset to idle after showing success animation
      setTimeout(() => {
        setState('idle')
        setSelectedAmount(null)
        setTokenAmount(null)
      }, 2000)
    } catch (error) {
      console.error('Quick buy failed:', error)
      setState('error')

      // Reset to idle after error
      setTimeout(() => {
        setSelectedAmount(null)
        setTokenAmount(null)
      }, 3000)
    }
  }, [selectedAmount, isInsufficientBalance, toast, translate])

  useEffect(() => {
    if (estimatedTokenAmount && state === 'confirming') {
      setTokenAmount(estimatedTokenAmount)
    }
  }, [estimatedTokenAmount, state])

  console.log({ asset })

  // Computed text values
  const titleText = translate('quickBuy.title', {
    assetOnChain: asset?.name ?? '',
  })
  const balanceLabel = translate('quickBuy.balance')
  const cancelText = translate('common.cancel')
  const confirmText = translate('common.confirm')
  const formattedSelectedAmount = selectedAmount ? number.toFiat(selectedAmount) : ''
  const estimatedTokenText = tokenAmount ? `≈ ${number.toCrypto(tokenAmount, asset?.symbol)}` : ''

  // Create amount button handlers
  const createAmountClickHandler = useCallback(
    (amount: number) => {
      return () => handleAmountClick(amount)
    },
    [handleAmountClick],
  )

  // Common components
  const Title = useCallback(
    () => (
      <Text fontSize='md' fontWeight='bold' color='text.subtle' textAlign='center'>
        {titleText}
      </Text>
    ),
    [titleText],
  )

  const Balance = useCallback(
    () => (
      <Flex alignItems='center' justifyContent='space-between'>
        <Text fontSize='md' fontWeight='bold' color='text.subtle'>
          {balanceLabel}
        </Text>
        <Flex>
          <Amount.Fiat color='text.base' value={feeAssetBalanceUserCurrency} pr={1} />
          (
          <Amount.Crypto
            color='text.base'
            value={feeAssetBalanceCryptoPrecision}
            symbol={feeAsset?.symbol ?? ''}
            maximumFractionDigits={6}
          />
          )
        </Flex>
      </Flex>
    ),
    [balanceLabel, feeAssetBalanceUserCurrency, feeAssetBalanceCryptoPrecision, feeAsset?.symbol],
  )

  const handleDismissError = useCallback(() => setState('idle'), [])
  const InsufficientFundsAlert = useCallback(
    () => (
      <Alert
        status='error'
        backgroundColor='background.error'
        borderRadius='md'
        position='relative'
      >
        <AlertIcon as={WarningIcon} />
        <Text fontWeight='normal' fontSize='sm'>
          {translate('quickBuy.error', {
            amount: selectedAmount ? number.toFiat(selectedAmount) : '$0',
          })}
        </Text>
        <CloseButton onClick={handleDismissError} />
      </Alert>
    ),
    [selectedAmount, number, translate, handleDismissError],
  )

  const AmountButtons = useCallback(() => {
    return (
      <HStack spacing={2}>
        {quickBuyPreferences.defaultAmounts.map(amount => {
          const handleClick = createAmountClickHandler(amount)
          const buttonText = number.toFiat(amount)

          return (
            <Button key={amount} variant='outline' size='sm' onClick={handleClick} flex={1}>
              {buttonText}
            </Button>
          )
        })}
      </HStack>
    )
  }, [quickBuyPreferences.defaultAmounts, createAmountClickHandler, number])

  const SelectedAmountDisplay = useCallback(() => {
    if (!selectedAmount) return null

    return (
      <Stack spacing={2} align='center'>
        <Button variant='solid' size='sm' isDisabled>
          {formattedSelectedAmount}
        </Button>

        {state === 'confirming' && (
          <>
            <Text fontSize='sm' color='text.subtle' textAlign='center'>
              {estimatedTokenText || <Skeleton height='20px' width='100px' />}
            </Text>

            <HStack spacing={2}>
              <Button
                variant='ghost'
                size='sm'
                leftIcon={CancelIcon}
                onClick={handleCancel}
                flex={1}
              >
                {cancelText}
              </Button>
              <Button
                variant='solid'
                size='sm'
                leftIcon={CheckIcon}
                onClick={handleConfirm}
                colorScheme='blue'
                flex={1}
              >
                {confirmText}
              </Button>
            </HStack>
          </>
        )}

        {state === 'loading' && (
          <HStack spacing={2}>
            <SkeletonCircle size='4' />
            <Skeleton height='20px' width='80px' />
          </HStack>
        )}

        {state === 'success' && <AnimatedCheck boxSize={32} />}
      </Stack>
    )
  }, [
    selectedAmount,
    state,
    formattedSelectedAmount,
    estimatedTokenText,
    cancelText,
    confirmText,
    handleCancel,
    handleConfirm,
  ])

  // Main render
  return (
    <Stack spacing={4}>
      <Title />

      {(state === 'idle' || state === 'loading' || state === 'success') && (
        <>
          <AmountButtons />
          <Balance />
        </>
      )}

      {state === 'confirming' && <SelectedAmountDisplay />}

      {state === 'error' && (
        <>
          <AmountButtons />
          <InsufficientFundsAlert />
          <Balance />
        </>
      )}
    </Stack>
  )
}
