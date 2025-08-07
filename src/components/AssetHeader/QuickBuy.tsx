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
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { TransactionExecutionState } from '@shapeshiftoss/swapper'
import { bn, bnOrZero } from '@shapeshiftoss/utils'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TbPencil } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { AnimatedCheck } from '../AnimatedCheck'
import { useCurrentHopIndex } from '../MultiHopTrade/components/TradeConfirm/hooks/useCurrentHopIndex'
import { useGetTradeRates } from '../MultiHopTrade/hooks/useGetTradeQuotes/useGetTradeRates'
import { QuickBuyTradeButton } from './QuickBuyTradeButton'

import { Amount } from '@/components/Amount/Amount'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { selectMarketDataByAssetIdUserCurrency } from '@/state/slices/marketDataSlice/selectors'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import {
  selectAssetById,
  selectFeeAssetById,
  selectPortfolioCryptoPrecisionBalanceByFilter,
  selectPortfolioUserCurrencyBalanceByAssetId,
} from '@/state/slices/selectors'
import { tradeInput } from '@/state/slices/tradeInputSlice/tradeInputSlice'
import {
  selectConfirmedQuote,
  selectConfirmedTradeExecutionState,
  selectFirstHop,
  selectHopExecutionMetadata,
  selectLastHop,
  selectSortedTradeQuotes,
} from '@/state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from '@/state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { TradeExecutionState } from '@/state/slices/tradeQuoteSlice/types'
import { useAppDispatch, useAppSelector, useSelectorWithArgs } from '@/state/store'

const editIcon = <Icon as={TbPencil} boxSize={6} color='text.subtle' />

export type QuickBuyState =
  | { status: 'idle'; amount: undefined }
  | { status: 'confirming' | 'executing' | 'success' | 'error'; amount: number }

const defaultState: QuickBuyState = { status: 'idle', amount: undefined }

type QuickBuyProps = {
  assetId: AssetId
  onEditAmounts: () => void
}

export const QuickBuy: React.FC<QuickBuyProps> = ({ assetId, onEditAmounts }) => {
  const translate = useTranslate()
  const { number } = useLocaleFormatter()
  const dispatch = useAppDispatch()

  const [quickBuyState, setQuickBuyState] = useState<QuickBuyState>(defaultState)
  const hasInitializedTradeRef = useRef(false)

  const resetTrade = useCallback(() => {
    hasInitializedTradeRef.current = false
    dispatch(tradeQuoteSlice.actions.clear())
    dispatch(tradeInput.actions.clear())
  }, [dispatch])

  useEffect(() => {
    return resetTrade // Reset on unmount
  }, [resetTrade])

  const sortedTradeQuotes = useAppSelector(selectSortedTradeQuotes)
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const feeAsset = useAppSelector(state => selectFeeAssetById(state, assetId))
  const quickBuyAmounts = useAppSelector(preferences.selectors.selectQuickBuyAmounts)

  const feeAssetFilter = useMemo(() => ({ assetId: feeAsset?.assetId }), [feeAsset?.assetId])
  const feeAssetBalanceCryptoPrecision = useAppSelector(s =>
    selectPortfolioCryptoPrecisionBalanceByFilter(s, feeAssetFilter),
  )
  const feeAssetBalanceUserCurrency = useAppSelector(
    state => selectPortfolioUserCurrencyBalanceByAssetId(state, feeAssetFilter) ?? '0',
  )

  const confirmedQuote = useAppSelector(selectConfirmedQuote)

  const assetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, assetId),
  )
  const feeAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, feeAsset?.assetId ?? ''),
  )

  const confirmedTradeExecutionState = useAppSelector(selectConfirmedTradeExecutionState)

  const isNativeAsset = useMemo(
    () => asset && feeAsset && asset.assetId === feeAsset.assetId,
    [asset, feeAsset],
  )

  useGetTradeRates()

  const handleError = useCallback(() => {
    setQuickBuyState({ status: 'error', amount: quickBuyState.amount ?? 0 })
    resetTrade()
  }, [quickBuyState.amount, resetTrade])

  const handleSuccess = useCallback(() => {
    setQuickBuyState({ status: 'success', amount: quickBuyState.amount ?? 0 })
    resetTrade()

    // If we're still in the success state after some time then reset
    setTimeout(() => {
      setQuickBuyState(currState => (currState.status === 'success' ? defaultState : currState))
    }, 7000)
  }, [quickBuyState.amount, resetTrade])

  const handleCancel = useCallback(() => {
    setQuickBuyState(defaultState)
    resetTrade()
  }, [resetTrade])

  const currentHopIndex = useCurrentHopIndex()
  const tradeQuoteFirstHop = useAppSelector(selectFirstHop)
  const tradeQuoteLastHop = useAppSelector(selectLastHop)
  const tradeQuoteStep = useMemo(() => {
    return currentHopIndex === 0 ? tradeQuoteFirstHop : tradeQuoteLastHop
  }, [currentHopIndex, tradeQuoteFirstHop, tradeQuoteLastHop])

  // Monitor swap execution for failures
  const hopExecutionMetadataFilter = useMemo(() => {
    if (!confirmedQuote?.id) return undefined
    return { tradeId: confirmedQuote.id, hopIndex: 0 }
  }, [confirmedQuote?.id])

  const hopExecutionMetadata = useSelectorWithArgs(
    selectHopExecutionMetadata,
    hopExecutionMetadataFilter ?? { tradeId: '', hopIndex: 0 },
  )

  // When we receive our best rate, lock it in and initialize the trade
  useEffect(() => {
    if (
      quickBuyState.status === 'confirming' &&
      sortedTradeQuotes.length &&
      !hasInitializedTradeRef.current
    ) {
      const bestNoErrorQuote = sortedTradeQuotes.find(quote => quote.errors.length === 0)
      if (bestNoErrorQuote?.quote === undefined) {
        handleError()
        return
      }

      dispatch(tradeQuoteSlice.actions.initializeQuickBuyTrade(bestNoErrorQuote.quote))
      hasInitializedTradeRef.current = true
    }
  }, [dispatch, handleError, quickBuyState.status, sortedTradeQuotes])

  // Monitor for swap execution failures and successes
  useEffect(() => {
    if (quickBuyState.status !== 'executing') return

    if (hopExecutionMetadata?.swap.state === TransactionExecutionState.Failed) {
      handleError()
    } else if (hopExecutionMetadata?.swap.state === TransactionExecutionState.Complete) {
      handleSuccess()
    }
  }, [handleError, handleSuccess, hopExecutionMetadata?.swap.state, quickBuyState.status])

  const estimatedBuyAmountCryptoPrecision = useMemo(() => {
    const { amount, status } = quickBuyState
    if ((status !== 'confirming' && status !== 'executing') || !assetMarketData?.price) return null
    const tokenAmountInUserCurrency = bn(amount).dividedBy(bn(assetMarketData.price))
    return tokenAmountInUserCurrency.toString()
  }, [quickBuyState, assetMarketData?.price])

  // Create amount button handlers
  const createAmountClickHandler = useCallback(
    (amount: number) => {
      return () => {
        if (!asset || !feeAsset || !feeAssetMarketData) return
        const estimatedSellAmountCryptoPrecision = bn(amount)
          .dividedBy(bn(feeAssetMarketData.price))
          .toString()
        dispatch(
          tradeInput.actions.setQuickBuySelection({
            sellAsset: feeAsset,
            buyAsset: asset,
            sellAmountCryptoPrecision: estimatedSellAmountCryptoPrecision,
          }),
        )
        setQuickBuyState({ status: 'confirming', amount })
      }
    },
    [asset, dispatch, feeAsset, feeAssetMarketData],
  )

  const handleDismissError = useCallback(() => setQuickBuyState(defaultState), [])

  const handleClickConfirm = useCallback(() => {
    if (quickBuyState.status !== 'confirming') return
    setQuickBuyState({ status: 'executing', amount: quickBuyState.amount })
  }, [quickBuyState.amount, quickBuyState.status])

  if (isNativeAsset) {
    // We use native asset as the buy asset right now so can't quick buy it
    return (
      <Stack spacing={4}>
        <Text fontSize='md' fontWeight='bold' color='text.subtle' textAlign='center'>
          {translate('quickBuy.nativeNotAvailable')}
        </Text>
      </Stack>
    )
  }

  return (
    <Stack spacing={4}>
      {quickBuyState.status !== 'confirming' && quickBuyState.status !== 'executing' && (
        <>
          <Text fontSize='md' fontWeight='bold' color='text.subtle' textAlign='center'>
            {translate('quickBuy.title', { assetOnChain: asset?.name ?? '' })}
          </Text>
          <HStack spacing={2}>
            {quickBuyAmounts.map(amount => {
              const isSuccess =
                quickBuyState.status === 'success' && amount === quickBuyState.amount
              const buttonText = isSuccess ? (
                <AnimatedCheck color='white' boxSize={6} />
              ) : (
                number.toFiat(amount)
              )

              return (
                <Button
                  key={amount}
                  rounded='full'
                  background={isSuccess ? 'green.500' : undefined}
                  onClick={createAmountClickHandler(amount)}
                  flex={1}
                  disabled={bnOrZero(feeAssetBalanceUserCurrency).toNumber() < amount}
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
          {quickBuyState.status === 'error' && (
            <Alert
              status='error'
              backgroundColor='background.error'
              borderRadius='md'
              position='relative'
            >
              <AlertIcon as={WarningIcon} />
              <Text fontWeight='normal' fontSize='sm'>
                {translate('quickBuy.error', {
                  amount: number.toFiat(quickBuyState.amount),
                })}
              </Text>
              <CloseButton onClick={handleDismissError} />
            </Alert>
          )}
          <Flex alignItems='center' justifyContent='space-between'>
            <Text fontSize='md' fontWeight='bold' color='text.subtle'>
              {translate('quickBuy.balance')}
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
        </>
      )}

      {(quickBuyState.status === 'confirming' || quickBuyState.status === 'executing') && (
        <Stack gap={4} align='center'>
          <Text fontSize='md' color='text.subtle' fontWeight='bold'>
            {translate('quickBuy.confirm')}
          </Text>

          <Flex flexDir='column' alignItems='center'>
            <Text
              fontSize='4xl'
              lineHeight='120%'
              fontWeight='bold'
              color='text.base'
              mb={0}
              pb={0}
            >
              {number.toFiat(quickBuyState.amount)}
            </Text>

            <Text fontSize='md' color='text.subtle' textAlign='center'>
              {estimatedBuyAmountCryptoPrecision ? (
                <Amount.Crypto
                  value={estimatedBuyAmountCryptoPrecision}
                  symbol={asset?.symbol ?? ''}
                  maximumFractionDigits={6}
                />
              ) : (
                <Skeleton height='20px' width='100px' />
              )}
            </Text>
          </Flex>

          <HStack spacing={3} width='100%'>
            {quickBuyState.status !== 'executing' && (
              <Button rounded='full' variant='ghost' size='lg' onClick={handleCancel} flex={1}>
                {translate('common.cancel')}
              </Button>
            )}
            {confirmedQuote &&
            tradeQuoteStep &&
            (confirmedTradeExecutionState === TradeExecutionState.Previewing ||
              confirmedTradeExecutionState === TradeExecutionState.FirstHop ||
              confirmedTradeExecutionState === TradeExecutionState.SecondHop) ? (
              <QuickBuyTradeButton
                activeTradeId={confirmedQuote.id}
                currentHopIndex={currentHopIndex}
                tradeQuoteStep={tradeQuoteStep}
                onConfirm={handleClickConfirm}
              />
            ) : (
              <Button
                rounded='full'
                variant='solid'
                size='lg'
                colorScheme='blue'
                flex={1}
                isDisabled
                isLoading
              />
            )}
          </HStack>
        </Stack>
      )}
    </Stack>
  )
}
