import {
  Button,
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

  const [state, setState] = useState<QuickBuyState>('idle')
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
  const handleAmountClick = useCallback(
    (amount: number) => {
      if (state !== 'idle') return
      setSelectedAmount(amount)
      setState('confirming')
    },
    [state],
  )

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

      toast({
        title: translate('trade.errors.transactionFailed'),
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })

      // Reset to idle after error
      setTimeout(() => {
        setState('idle')
        setSelectedAmount(null)
        setTokenAmount(null)
      }, 3000)
    }
  }, [selectedAmount, isInsufficientBalance, toast, translate])

  const handleRetry = useCallback(() => {
    setState('idle')
  }, [])

  useEffect(() => {
    if (estimatedTokenAmount && state === 'confirming') {
      setTokenAmount(estimatedTokenAmount)
    }
  }, [estimatedTokenAmount, state])

  console.log({ asset })

  // Computed text values
  const titleText = translate('quickBuy.title', {
    assetOnChain: `${asset?.symbol}${
      asset?.networkName !== undefined ? ` on ${asset.networkName}` : ''
    }`,
  })
  const balanceLabel = translate('quickBuy.balance')
  const cancelText = translate('common.cancel')
  const confirmText = translate('common.confirm')
  const insufficientFundsText = translate('trade.errors.insufficientFunds')
  const transactionFailedText = translate('quickBuy.transactionFailed')
  const tryAgainText = translate('quickBuy.tryAgain')
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
    [balanceLabel, feeAssetBalanceUserCurrency, feeAssetBalanceCryptoPrecision, feeAsset.symbol],
  )

  const AmountButtons = useCallback(() => {
    const isDisabled = state !== 'idle'

    return (
      <HStack spacing={2}>
        {quickBuyPreferences.defaultAmounts.map(amount => {
          const handleClick = createAmountClickHandler(amount)
          const buttonText = number.toFiat(amount)

          return (
            <Button
              key={amount}
              variant='outline'
              size='sm'
              onClick={handleClick}
              flex={1}
              isDisabled={isDisabled}
            >
              {buttonText}
            </Button>
          )
        })}
      </HStack>
    )
  }, [state, quickBuyPreferences.defaultAmounts, createAmountClickHandler, number])

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
                isDisabled={!tokenAmount || isInsufficientBalance}
                colorScheme={isInsufficientBalance ? 'red' : 'blue'}
                flex={1}
              >
                {isInsufficientBalance ? insufficientFundsText : confirmText}
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

        {state === 'error' && (
          <>
            <Text fontSize='sm' color='red.400' textAlign='center'>
              {transactionFailedText}
            </Text>
            <Button variant='outline' size='sm' onClick={handleRetry}>
              {tryAgainText}
            </Button>
          </>
        )}
      </Stack>
    )
  }, [
    selectedAmount,
    state,
    formattedSelectedAmount,
    estimatedTokenText,
    tokenAmount,
    isInsufficientBalance,
    cancelText,
    confirmText,
    insufficientFundsText,
    transactionFailedText,
    tryAgainText,
    handleCancel,
    handleConfirm,
    handleRetry,
  ])

  // Main render
  return (
    <Stack spacing={4}>
      <Title />

      {state === 'idle' && (
        <>
          <AmountButtons />
          <Balance />
        </>
      )}

      {state !== 'idle' && (
        <>
          <Balance />
          <SelectedAmountDisplay />
        </>
      )}
    </Stack>
  )
}
