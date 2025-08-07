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
import { CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'
import { bn } from '@shapeshiftoss/utils'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TbPencil } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { useCurrentHopIndex } from '../MultiHopTrade/components/TradeConfirm/hooks/useCurrentHopIndex'
import { useGetTradeRates } from '../MultiHopTrade/hooks/useGetTradeQuotes/useGetTradeRates'
import { QuickBuyTradeButton } from './QuickBuyTradeButton'

import { Amount } from '@/components/Amount/Amount'
import { useTradeReceiveAddress } from '@/components/MultiHopTrade/components/TradeInput/hooks/useTradeReceiveAddress'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { useWallet } from '@/hooks/useWallet/useWallet'
import {
  selectMarketDataByAssetIdUserCurrency,
  selectUserCurrencyToUsdRate,
} from '@/state/slices/marketDataSlice/selectors'
import { selectPortfolioAccountMetadataByAccountId } from '@/state/slices/portfolioSlice/selectors'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import {
  selectAssetById,
  selectFeeAssetById,
  selectPortfolioCryptoPrecisionBalanceByFilter,
  selectPortfolioUserCurrencyBalanceByAssetId,
} from '@/state/slices/selectors'
import { selectFirstHopSellAccountId } from '@/state/slices/tradeInputSlice/selectors'
import { tradeInput } from '@/state/slices/tradeInputSlice/tradeInputSlice'
import {
  selectActiveQuote,
  selectActiveQuoteMetaOrDefault,
  selectConfirmedQuoteTradeId,
  selectConfirmedTradeExecution,
  selectConfirmedTradeExecutionState,
  selectFirstHop,
  selectLastHop,
  selectSortedTradeQuotes,
} from '@/state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from '@/state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { TradeExecutionState } from '@/state/slices/tradeQuoteSlice/types'
import { useAppDispatch, useAppSelector } from '@/state/store'

const editIcon = <Icon as={TbPencil} boxSize={6} color='text.subtle' />

export type QuickBuyState = 'idle' | 'confirming' | 'loading' | 'success' | 'error'

type QuickBuyProps = {
  assetId: AssetId
  onEditAmounts: () => void
}

export const QuickBuy: React.FC<QuickBuyProps> = ({ assetId, onEditAmounts }) => {
  const translate = useTranslate()
  const { number } = useLocaleFormatter()
  const dispatch = useAppDispatch()
  const {
    state: { isConnected, wallet },
  } = useWallet()

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
  const activeTrade = useAppSelector(selectActiveQuote)
  const activeQuoteMeta = useAppSelector(selectActiveQuoteMetaOrDefault)
  const feeAssetBalanceUserCurrency = useAppSelector(
    state => selectPortfolioUserCurrencyBalanceByAssetId(state, filter) ?? '0',
  )
  const assetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, assetId),
  )
  const feeAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, feeAsset?.assetId ?? ''),
  )

  // Native asset check (gas token of the chain)
  const isNativeAsset = useMemo(() => asset && feeAsset && asset.assetId === feeAsset.assetId, [asset, feeAsset])

  const confirmedTradeExecution = useAppSelector(selectConfirmedTradeExecution)
  const confirmedTradeExecutionState = useAppSelector(selectConfirmedTradeExecutionState)
  const confirmedId = useAppSelector(selectConfirmedQuoteTradeId)

  // console.log({ activeTrade, confirmedTradeExecution, confirmedId, confirmedTradeExecutionState })

  useGetTradeRates()

  // Ensure we only lock/confirm once per selection
  const hasLockedAndConfirmedRef = useRef(false)

  const currentHopIndex = useCurrentHopIndex()
  const tradeQuoteFirstHop = useAppSelector(selectFirstHop)
  const tradeQuoteLastHop = useAppSelector(selectLastHop)
  const tradeQuoteStep = useMemo(() => {
    return currentHopIndex === 0 ? tradeQuoteFirstHop : tradeQuoteLastHop
  }, [currentHopIndex, tradeQuoteFirstHop, tradeQuoteLastHop])

  // Resolve sell account and metadata prerequisites
  const sellAccountId = useAppSelector(selectFirstHopSellAccountId)
  const sellAccountMetadataFilter = useMemo(() => ({ accountId: sellAccountId }), [sellAccountId])
  const sellAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, sellAccountMetadataFilter),
  )
  const { manualReceiveAddress, walletReceiveAddress } = useTradeReceiveAddress()
  const receiveAddress = manualReceiveAddress ?? walletReceiveAddress

  const arePrerequisitesSatisfied = useMemo(() => {
    if (!isConnected || !wallet) return false
    if (!activeTrade || !tradeQuoteStep) return false
    const accountNumber = sellAccountMetadata?.bip44Params?.accountNumber
    if (accountNumber === undefined) return false
    if (!receiveAddress) return false
    const { chainNamespace } = fromChainId(tradeQuoteStep.sellAsset.chainId)
    if (chainNamespace === CHAIN_NAMESPACE.Utxo && !sellAccountMetadata?.accountType) return false
    return true
  }, [isConnected, wallet, activeTrade, tradeQuoteStep, sellAccountMetadata, receiveAddress])

  // When user enters confirming state and prerequisites are met, lock it as confirmed for preview (do NOT confirm here)
  useEffect(() => {
    // console.log({
    //   state,
    //   activeTrade,
    //   activeQuoteMeta,
    //   hasLocked: hasLockedAndConfirmedRef.current,
    // })
    if (state !== 'confirming') return
    if (!activeTrade || !activeQuoteMeta) return
    if (!arePrerequisitesSatisfied) return
    if (hasLockedAndConfirmedRef.current) return

    // console.log('locking in quote')

    // Lock the current rate as the confirmed quote and initialize execution
    dispatch(tradeQuoteSlice.actions.setConfirmedQuote(activeTrade))
    dispatch(tradeQuoteSlice.actions.clearQuoteExecutionState(activeTrade.id))
    dispatch(tradeQuoteSlice.actions.setTradeInitialized(activeTrade.id))

    hasLockedAndConfirmedRef.current = true
  }, [state, activeTrade, activeQuoteMeta, arePrerequisitesSatisfied, dispatch])

  // console.log({ currentHopIndex, tradeQuoteFirstHop, tradeQuoteLastHop, tradeQuoteStep })

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
      // TODO - ensure wallet connect
      // if (!isConnected) {
      //   return handleConnect()
      // }
      if (!asset || !feeAsset || !feeAssetMarketData) return
      setSelectedAmount(amount)
      const estimatedSellAmount = bn(amount).dividedBy(bn(feeAssetMarketData.price)).toString()
      // TODO probably combine this into one
      console.log({ feeAsset, asset })
      dispatch(tradeInput.actions.setSellAsset(feeAsset))
      dispatch(tradeInput.actions.setBuyAsset(asset))
      dispatch(tradeInput.actions.setSellAmountCryptoPrecision(estimatedSellAmount))
      setState('confirming')
    },
    [asset, dispatch, feeAsset, feeAssetMarketData],
  )

  const handleCancel = useCallback(() => {
    setState('idle')
    setSelectedAmount(null)
    hasLockedAndConfirmedRef.current = false
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
          {activeTrade &&
          activeQuoteMeta &&
          tradeQuoteStep &&
          (confirmedTradeExecutionState === TradeExecutionState.Previewing ||
            confirmedTradeExecutionState === TradeExecutionState.FirstHop) ? (
            <QuickBuyTradeButton
              activeTradeId={activeTrade.id}
              currentHopIndex={currentHopIndex}
              tradeQuoteStep={tradeQuoteStep}
            />
          ) : (
            <Button
              rounded='full'
              variant='solid'
              size='lg'
              onClick={handleConfirm}
              colorScheme='blue'
              flex={1}
              isDisabled
            >
              ...
            </Button>
          )}
        </HStack>
      </Stack>
    )
  }, [
    selectedAmount,
    translate,
    formattedSelectedAmount,
    estimatedTokenAmount,
    asset?.symbol,
    handleCancel,
    cancelText,
    activeTrade,
    activeQuoteMeta,
    tradeQuoteStep,
    confirmedTradeExecutionState,
    currentHopIndex,
    handleConfirm,
  ])

  // Main render
  // If asset is native, only show the title with the notice
  if (isNativeAsset) {
    return (
      <Stack spacing={4}>
        <Text fontSize='md' fontWeight='bold' color='text.subtle' textAlign='center'>
          Quick buy not available on native assets
        </Text>
      </Stack>
    )
  }

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
