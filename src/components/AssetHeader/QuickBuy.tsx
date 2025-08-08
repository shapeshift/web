import { WarningIcon } from '@chakra-ui/icons'
import {
  Alert,
  AlertIcon,
  Button,
  CloseButton,
  Flex,
  HStack,
  Icon,
  IconButton,
  Skeleton,
  Stack,
  Text,
  useToast,
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { bn } from '@shapeshiftoss/utils'
import { useCallback, useMemo, useState } from 'react'
import { TbPencil } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
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

const editIcon = <Icon as={TbPencil} boxSize={6} color='text.subtle' />

export type QuickBuyState = 'idle' | 'confirming' | 'loading' | 'success' | 'error'

type QuickBuyProps = {
  assetId: AssetId
  onEditAmounts: () => void
}

export const QuickBuy: React.FC<QuickBuyProps> = ({ assetId, onEditAmounts }) => {
  const translate = useTranslate()
  const toast = useToast()
  const { number } = useLocaleFormatter()

  const [state, setState] = useState<QuickBuyState>('idle')
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)

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
  }, [])

  const handleConfirm = useCallback(async () => {
    if (!selectedAmount) {
      setState('idle')
      return
    }

    if (isInsufficientBalance) {
      setState('error')
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
      }, 2000)
    } catch (error) {
      setSelectedAmount(null)
      setState('error')

      // Reset to idle after error
      setTimeout(() => {
        setSelectedAmount(null)
      }, 3000)
    }
  }, [isInsufficientBalance, selectedAmount])

  // Computed text values
  const titleText = translate('quickBuy.title', {
    assetOnChain: asset?.name ?? '',
  })
  const balanceLabel = translate('quickBuy.balance')
  const cancelText = translate('common.cancel')
  const confirmText = translate('common.confirm')
  const formattedSelectedAmount = selectedAmount ? number.toFiat(selectedAmount) : ''

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
            <Button
              key={amount}
              rounded='full'
              onClick={handleClick}
              flex={1}
              fontSize='lg'
              fontWeight='semibold'
            >
              {buttonText}
            </Button>
          )
        })}
        <IconButton
          aria-label={translate('quickBuy.edit')}
          isRound
          onClick={onEditAmounts}
          icon={editIcon}
        />
      </HStack>
    )
  }, [
    quickBuyPreferences.defaultAmounts,
    translate,
    onEditAmounts,
    createAmountClickHandler,
    number,
  ])

  const SelectedAmountDisplay = useCallback(() => {
    if (!selectedAmount) return null

    return (
      <Stack gap={4} align='center'>
        <Text fontSize='md' color='text.subtle' fontWeight='bold'>
          {translate('quickBuy.confirm')}
        </Text>

        <Flex flexDir='column' alignItems='center'>
          <Text fontSize='4xl' lineHeight='120%' fontWeight='bold' color='text.base' mb={0} pb={0}>
            {formattedSelectedAmount}
          </Text>

          <Text fontSize='md' color='text.subtle' textAlign='center'>
            {estimatedTokenAmount ? (
              <Amount.Crypto
                value={estimatedTokenAmount}
                symbol={asset?.symbol ?? ''}
                maximumFractionDigits={6}
              />
            ) : (
              <Skeleton height='20px' width='100px' />
            )}
          </Text>
        </Flex>

        <HStack spacing={3} width='100%'>
          <Button rounded='full' variant='ghost' size='lg' onClick={handleCancel} flex={1}>
            {cancelText}
          </Button>
          <Button
            rounded='full'
            variant='solid'
            size='lg'
            onClick={handleConfirm}
            colorScheme='blue'
            flex={1}
          >
            {confirmText}
          </Button>
        </HStack>
      </Stack>
    )
  }, [
    selectedAmount,
    formattedSelectedAmount,
    estimatedTokenAmount,
    asset?.symbol,
    cancelText,
    confirmText,
    handleCancel,
    handleConfirm,
    translate,
  ])

  // Main render
  return (
    <Stack spacing={4}>
      {(state === 'idle' || state === 'loading' || state === 'success') && (
        <>
          <Title />
          <AmountButtons />
          <Balance />
        </>
      )}

      {state === 'confirming' && <SelectedAmountDisplay />}

      {state === 'error' && (
        <>
          <Title />
          <AmountButtons />
          <InsufficientFundsAlert />
          <Balance />
        </>
      )}
    </Stack>
  )
}
