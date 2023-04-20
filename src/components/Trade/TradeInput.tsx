import { ArrowDownIcon, ArrowForwardIcon, ArrowUpIcon } from '@chakra-ui/icons'
import {
  Button,
  Flex,
  IconButton,
  Stack,
  useColorModeValue,
  useDisclosure,
  useMediaQuery,
} from '@chakra-ui/react'
import { ethAssetId } from '@shapeshiftoss/caip'
import type { InterpolationOptions } from 'node-polyglot'
import { useCallback, useMemo, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { useHistory } from 'react-router'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { AssetSearchModal } from 'components/Modals/AssetSearch/AssetSearchModal'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useIsTradingActive } from 'components/Trade/hooks/useIsTradingActive'
import { useSwapper } from 'components/Trade/hooks/useSwapper/useSwapper'
import { getSendMaxAmount } from 'components/Trade/hooks/useSwapper/utils'
import { useSwapperService } from 'components/Trade/hooks/useSwapperService'
import { useTradeQuoteService } from 'components/Trade/hooks/useTradeQuoteService'
import { AssetClickAction } from 'components/Trade/hooks/useTradeRoutes/types'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useToggle } from 'hooks/useToggle/useToggle'
import { useWallet } from 'hooks/useWallet/useWallet'
import { walletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { bn, bnOrZero, positiveOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import { getMaybeCompositeAssetSymbol } from 'lib/mixpanel/helpers'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvents } from 'lib/mixpanel/types'
import { SwapperName } from 'lib/swapper/api'
import { getSwappersApi } from 'state/apis/swapper/getSwappersApi'
import {
  selectSwapperApiPending,
  selectSwapperApiTradeQuotePending,
  selectSwapperApiUsdRatesPending,
  selectSwapperQueriesInitiated,
} from 'state/apis/swapper/selectors'
import {
  selectAssets,
  selectFeeAssetByChainId,
  selectFeeAssetById,
} from 'state/slices/assetsSlice/selectors'
import {
  selectPortfolioCryptoBalanceBaseUnitByFilter,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'
import {
  selectQuoteBuyAmountCryptoPrecision,
  selectTotalTradeFeeBuyAssetCryptoPrecision,
} from 'state/zustand/swapperStore/amountSelectors'
import {
  selectAction,
  selectAmount,
  selectBuyAmountCryptoPrecision,
  selectBuyAmountFiat,
  selectBuyAsset,
  selectBuyAssetAccountId,
  selectCheckApprovalNeededForWallet,
  selectFeeAssetFiatRate,
  selectFees,
  selectIsSendMax,
  selectQuote,
  selectReceiveAddress,
  selectSellAmountCryptoPrecision,
  selectSellAmountFiat,
  selectSellAsset,
  selectSellAssetAccountId,
  selectSlippage,
  selectSwapperSupportsCrossAccountTrade,
} from 'state/zustand/swapperStore/selectors'
import { useSwapperStore } from 'state/zustand/swapperStore/useSwapperStore'
import { breakpoints } from 'theme/theme'

import { TradeAssetSelect } from './Components/AssetSelection'
import { RateGasRow } from './Components/RateGasRow'
import type { TradeAssetInputProps } from './Components/TradeAssetInput'
import { TradeAssetInput } from './Components/TradeAssetInput'
import { TradeQuotes } from './Components/TradeQuotes/TradeQuotes'
import { useTradeRoutes } from './hooks/useTradeRoutes/useTradeRoutes'
import { ReceiveSummary } from './TradeConfirm/ReceiveSummary'
import { TradeAmountInputField, TradeRoutePaths } from './types'

const moduleLogger = logger.child({ namespace: ['TradeInput'] })

export const TradeInput = () => {
  useSwapperService()
  const [isLoading, setIsLoading] = useState(false)
  const [showQuotes, toggleShowQuotes] = useToggle(false)
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const isTradeRatesEnabled = useFeatureFlag('TradeRates')
  const { getAvailableSwappers } = getSwappersApi.endpoints
  const { tradeQuoteArgs } = useTradeQuoteService()
  const dispatch = useAppDispatch()

  const { isTradingActiveOnSellPool, isTradingActiveOnBuyPool } = useIsTradingActive()

  const sellAssetAccountId = useSwapperStore(selectSellAssetAccountId)
  const buyAssetAccountId = useSwapperStore(selectBuyAssetAccountId)
  const updateSelectedSellAssetAccountId = useSwapperStore(
    state => state.updateSelectedSellAssetAccountId,
  )
  const updateSelectedBuyAssetAccountId = useSwapperStore(
    state => state.updateSelectedBuyAssetAccountId,
  )
  const activeQuote = useSwapperStore(selectQuote)
  const fees = useSwapperStore(selectFees)
  const slippage = useSwapperStore(selectSlippage)
  const updateTrade = useSwapperStore(state => state.updateTrade)
  const updateAction = useSwapperStore(state => state.updateAction)
  const updateAmount = useSwapperStore(state => state.updateAmount)
  const fiatBuyAmount = useSwapperStore(selectBuyAmountFiat)
  const fiatSellAmount = useSwapperStore(selectSellAmountFiat)
  const receiveAddress = useSwapperStore(selectReceiveAddress)
  const updateIsSendMax = useSwapperStore(state => state.updateIsSendMax)
  const feeAssetFiatRate = useSwapperStore(selectFeeAssetFiatRate)
  const buyAsset = useSwapperStore(selectBuyAsset)
  const sellAsset = useSwapperStore(selectSellAsset)
  const sellAssetChainId = sellAsset?.chainId
  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, sellAssetChainId ?? ''))
  const buyAmountCryptoPrecision = useSwapperStore(selectBuyAmountCryptoPrecision)
  const sellAmountCryptoPrecision = useSwapperStore(selectSellAmountCryptoPrecision)
  const updateTradeAmountsFromQuote = useSwapperStore(state => state.updateTradeAmountsFromQuote)
  const swapperSupportsCrossAccountTrade = useSwapperStore(selectSwapperSupportsCrossAccountTrade)
  const checkApprovalNeeded = useSwapperStore(selectCheckApprovalNeededForWallet)
  const handleSwitchAssets = useSwapperStore(state => state.handleSwitchAssets)
  const handleInputAmountChange = useSwapperStore(state => state.handleInputAmountChange)
  const quoteBuyAmountCryptoPrecision = useSwapperStore(selectQuoteBuyAmountCryptoPrecision)
  const totalTradeFeeBuyAssetCryptoPrecision = useSwapperStore(
    selectTotalTradeFeeBuyAssetCryptoPrecision,
  )
  const action = useSwapperStore(selectAction)
  const amount = useSwapperStore(selectAmount)
  const isSendMax = useSwapperStore(selectIsSendMax)
  const { getTrade, supportedSellAssetsByMarketCap, supportedBuyAssetsByMarketCap } = useSwapper()
  const translate = useTranslate()
  const history = useHistory()
  const mixpanel = getMixPanel()
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  const { handleSubmit } = useFormContext()
  const wallet = useWallet().state.wallet
  const { handleAssetClick } = useTradeRoutes()

  // Selectors
  const assets = useAppSelector(selectAssets)
  const sellFeeAsset = useAppSelector(state =>
    selectFeeAssetById(state, sellAsset?.assetId ?? ethAssetId),
  )
  const activeSwapper = useSwapperStore(state => state.activeSwapperWithMetadata?.swapper)
  const swapperName = useMemo(() => activeSwapper?.name ?? '', [activeSwapper])

  if (!sellFeeAsset) throw new Error(`Asset not found for AssetId ${sellAsset?.assetId}`)

  const feeAssetBalanceFilter = useMemo(
    () => ({ assetId: sellFeeAsset?.assetId, accountId: sellAssetAccountId ?? '' }),
    [sellAssetAccountId, sellFeeAsset?.assetId],
  )
  const feeAssetBalance = useAppSelector(s =>
    selectPortfolioCryptoPrecisionBalanceByFilter(s, feeAssetBalanceFilter),
  )

  const sellAssetBalanceFilter = useMemo(
    () => ({ accountId: sellAssetAccountId, assetId: sellAsset?.assetId ?? '' }),
    [sellAssetAccountId, sellAsset?.assetId],
  )
  const sellAssetBalanceCrypto = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, sellAssetBalanceFilter),
  )
  const sellAssetBalanceHuman = useAppSelector(state =>
    selectPortfolioCryptoPrecisionBalanceByFilter(state, sellAssetBalanceFilter),
  )

  const isSwapperApiPending = useSelector(selectSwapperApiPending)
  const isTradeQuotePending = useSelector(selectSwapperApiTradeQuotePending)
  const isUsdRatesPending = useSelector(selectSwapperApiUsdRatesPending)
  const isSwapperApiInitiated = useSelector(selectSwapperQueriesInitiated)

  const quoteAvailableForCurrentAssetPair = useMemo(() => {
    if (!activeQuote) return false
    return (
      activeQuote.buyAsset?.assetId === buyAsset?.assetId &&
      activeQuote.sellAsset?.assetId === sellAsset?.assetId
    )
  }, [buyAsset?.assetId, activeQuote, sellAsset?.assetId])

  // Constants
  const walletSupportsSellAssetChain =
    sellAsset?.chainId && walletSupportsChain({ wallet, chainId: sellAsset?.chainId })

  const walletSupportsBuyAssetChain =
    buyAsset?.chainId && walletSupportsChain({ wallet, chainId: buyAsset?.chainId })

  const walletSupportsTradeAssetChains = walletSupportsBuyAssetChain && walletSupportsSellAssetChain

  const gasFeeFiat = bnOrZero(fees?.networkFeeCryptoHuman)
    .times(bnOrZero(feeAssetFiatRate))
    .toString()

  const hasValidSellAmount = bnOrZero(sellAmountCryptoPrecision).gt(0)

  const handleInputChange = useCallback(
    (inputAction: TradeAmountInputField, inputAmount: string) => {
      // No-op if nothing material has changed
      if (inputAction === action && inputAmount === amount) return
      updateAction(inputAction)
      // If we've overridden the input we are no longer in sendMax mode
      updateIsSendMax(false)
      updateAmount(inputAmount)

      handleInputAmountChange()
    },
    [action, amount, updateAction, updateIsSendMax, updateAmount, handleInputAmountChange],
  )

  const handleSendMax: TradeAssetInputProps['onPercentOptionClick'] = useCallback(async () => {
    if (!(sellAsset && activeQuote)) return

    // Network fee is a function of the sell amount, so we need a quote for an arbitrarily high sell amount to ensure
    // we get a workable max amount
    const availableSwapperTypesWithQuoteMetadata =
      tradeQuoteArgs && feeAsset
        ? (
            await dispatch(
              getAvailableSwappers.initiate({
                ...tradeQuoteArgs,
                sellAmountBeforeFeesCryptoBaseUnit: '10000000', // arbitrarily high sell amount for max send quote
                feeAsset,
              }),
            )
          ).data
        : undefined

    const maxQuote = availableSwapperTypesWithQuoteMetadata?.[0]?.quote

    const maxSendAmount = maxQuote
      ? bnOrZero(getSendMaxAmount(sellAsset, sellFeeAsset, maxQuote, sellAssetBalanceCrypto))
          .times(0.99) // reduce the computed amount by 1% to ensure we don't exceed the max
          .toFixed()
      : '0'
    updateAction(TradeAmountInputField.SELL_CRYPTO)
    updateIsSendMax(true)
    updateAmount(maxSendAmount)
    handleInputAmountChange()

    if (availableSwapperTypesWithQuoteMetadata) {
      updateTradeAmountsFromQuote()
    }
  }, [
    sellAsset,
    activeQuote,
    sellFeeAsset,
    sellAssetBalanceCrypto,
    updateAction,
    updateIsSendMax,
    tradeQuoteArgs,
    feeAsset,
    dispatch,
    getAvailableSwappers,
    updateAmount,
    handleInputAmountChange,
    updateTradeAmountsFromQuote,
  ])
  const onSubmit = useCallback(async () => {
    setIsLoading(true)
    try {
      if (sellAsset && buyAsset && mixpanel) {
        const compositeBuyAsset = getMaybeCompositeAssetSymbol(buyAsset.assetId, assets)
        const compositeSellAsset = getMaybeCompositeAssetSymbol(sellAsset.assetId, assets)
        mixpanel.track(MixPanelEvents.TradePreview, {
          buyAsset: compositeBuyAsset,
          sellAsset: compositeSellAsset,
          fiatAmount: fiatSellAmount,
          swapperName,
          [compositeBuyAsset]: buyAmountCryptoPrecision,
          [compositeSellAsset]: sellAmountCryptoPrecision,
        })
      }
      if (!wallet) throw new Error('No wallet available')
      const isApprovalNeeded = await checkApprovalNeeded(wallet)
      if (isApprovalNeeded) {
        history.push({ pathname: TradeRoutePaths.Approval })
        return
      }
      const trade = await getTrade()
      if (trade.isErr()) throw trade.unwrapErr()
      updateTrade(trade.unwrap())
      history.push({ pathname: TradeRoutePaths.Confirm })
    } catch (e) {
      moduleLogger.error(e, 'onSubmit error')
    } finally {
      setIsLoading(false)
    }
  }, [
    assets,
    buyAmountCryptoPrecision,
    buyAsset,
    checkApprovalNeeded,
    fiatSellAmount,
    getTrade,
    history,
    mixpanel,
    sellAmountCryptoPrecision,
    sellAsset,
    swapperName,
    updateTrade,
    wallet,
  ])

  const onSellAssetInputChange: TradeAssetInputProps['onChange'] = useCallback(
    async (value: string, isFiat: boolean | undefined) => {
      const action = isFiat ? TradeAmountInputField.SELL_FIAT : TradeAmountInputField.SELL_CRYPTO
      await handleInputChange(action, value)
    },
    [handleInputChange],
  )

  const onBuyAssetInputChange: TradeAssetInputProps['onChange'] = useCallback(
    async (value: string, isFiat: boolean | undefined) => {
      const action = isFiat ? TradeAmountInputField.BUY_FIAT : TradeAmountInputField.BUY_CRYPTO
      await handleInputChange(action, value)
    },
    [handleInputChange],
  )

  const handleSellAccountIdChange: AccountDropdownProps['onChange'] = accountId =>
    updateSelectedSellAssetAccountId(accountId)

  const handleBuyAccountIdChange: AccountDropdownProps['onChange'] = accountId =>
    updateSelectedBuyAssetAccountId(accountId)

  const isBelowMinSellAmount = useMemo(() => {
    const minSellAmount = toBaseUnit(
      bnOrZero(activeQuote?.minimumCryptoHuman),
      activeQuote?.sellAsset.precision || 0,
    )

    return (
      bnOrZero(toBaseUnit(bnOrZero(sellAmountCryptoPrecision), sellAsset?.precision || 0)).lt(
        minSellAmount,
      ) &&
      hasValidSellAmount &&
      !isTradeQuotePending
    )
  }, [
    hasValidSellAmount,
    isTradeQuotePending,
    activeQuote?.minimumCryptoHuman,
    activeQuote?.sellAsset.precision,
    sellAmountCryptoPrecision,
    sellAsset?.precision,
  ])

  const feesExceedsSellAmount = useMemo(
    () =>
      bnOrZero(sellAmountCryptoPrecision).isGreaterThan(0) &&
      bnOrZero(buyAmountCryptoPrecision).isLessThanOrEqualTo(0) &&
      !isTradeQuotePending,
    [sellAmountCryptoPrecision, buyAmountCryptoPrecision, isTradeQuotePending],
  )

  const getErrorTranslationKey = useCallback((): string | [string, InterpolationOptions] => {
    const hasValidTradeBalance = bnOrZero(sellAssetBalanceHuman).gte(
      bnOrZero(sellAmountCryptoPrecision),
    )
    // when trading from ETH, the value of TX in ETH is deducted
    const tradeDeduction =
      sellFeeAsset?.assetId === sellAsset?.assetId ? bnOrZero(sellAmountCryptoPrecision) : bn(0)
    const shouldDeductNetworkFeeFromGasBalanceCheck = swapperName !== SwapperName.CowSwap
    const hasEnoughBalanceForGas = bnOrZero(feeAssetBalance)
      .minus(
        shouldDeductNetworkFeeFromGasBalanceCheck
          ? fromBaseUnit(
              bnOrZero(activeQuote?.feeData.networkFeeCryptoBaseUnit),
              sellFeeAsset?.precision,
            )
          : 0,
      )
      .minus(tradeDeduction)
      .gte(0)

    const minLimit = `${bnOrZero(activeQuote?.minimumCryptoHuman).decimalPlaces(6)} ${
      activeQuote?.sellAsset.symbol
    }`

    if (isSwapperApiPending || !isSwapperApiInitiated) return 'common.loadingText'
    if (!wallet) return 'common.connectWallet'
    if (!walletSupportsSellAssetChain)
      return [
        'trade.errors.assetNotSupportedByWallet',
        {
          assetSymbol: sellAsset?.symbol ?? translate('trade.errors.sellAssetStartSentence'),
        },
      ]
    if (!walletSupportsBuyAssetChain)
      return [
        'trade.errors.assetNotSupportedByWallet',
        {
          assetSymbol: buyAsset?.symbol ?? translate('trade.errors.buyAssetStartSentence'),
        },
      ]
    if (!activeSwapper) return 'trade.errors.invalidTradePairBtnText'
    if (!isTradingActiveOnSellPool && activeSwapper.name === SwapperName.Thorchain) {
      return [
        'trade.errors.tradingNotActive',
        {
          assetSymbol: sellAsset?.symbol ?? '',
        },
      ]
    }
    if (!isTradingActiveOnBuyPool && activeSwapper.name === SwapperName.Thorchain) {
      return [
        'trade.errors.tradingNotActive',
        {
          assetSymbol: buyAsset?.symbol ?? '',
        },
      ]
    }

    if (!hasValidTradeBalance) return 'common.insufficientFunds'
    if (hasValidTradeBalance && !hasEnoughBalanceForGas && hasValidSellAmount)
      return [
        'common.insufficientAmountForGas',
        {
          assetSymbol: sellFeeAsset?.symbol ?? translate('trade.errors.sellAssetMiddleSentence'),
        },
      ]
    if (isBelowMinSellAmount) {
      return activeSwapper.name === SwapperName.LIFI
        ? 'trade.errors.amountTooSmallOrInvalidTradePair'
        : ['trade.errors.amountTooSmall', { minLimit }]
    }
    if (feesExceedsSellAmount) return 'trade.errors.sellAmountDoesNotCoverFee'
    if (isTradeQuotePending && quoteAvailableForCurrentAssetPair) return 'trade.updatingQuote'
    if (!receiveAddress)
      return [
        'trade.errors.noReceiveAddress',
        {
          assetSymbol: buyAsset?.symbol ?? translate('trade.errors.buyAssetMiddleSentence'),
        },
      ]

    return 'trade.previewTrade'
  }, [
    sellAssetBalanceHuman,
    sellAmountCryptoPrecision,
    sellFeeAsset?.assetId,
    sellFeeAsset?.precision,
    sellFeeAsset?.symbol,
    sellAsset?.assetId,
    sellAsset?.symbol,
    swapperName,
    feeAssetBalance,
    activeQuote?.feeData.networkFeeCryptoBaseUnit,
    activeQuote?.minimumCryptoHuman,
    activeQuote?.sellAsset.symbol,
    isSwapperApiPending,
    isSwapperApiInitiated,
    wallet,
    walletSupportsSellAssetChain,
    translate,
    walletSupportsBuyAssetChain,
    buyAsset?.symbol,
    activeSwapper,
    isTradingActiveOnSellPool,
    isTradingActiveOnBuyPool,
    hasValidSellAmount,
    isBelowMinSellAmount,
    feesExceedsSellAmount,
    isTradeQuotePending,
    quoteAvailableForCurrentAssetPair,
    receiveAddress,
  ])

  const hasError = useMemo(() => {
    switch (getErrorTranslationKey()) {
      case 'trade.previewTrade':
      case 'trade.updatingQuote':
      case 'common.loadingText':
        return false
      default:
        return true
    }
  }, [getErrorTranslationKey])

  const sellAmountTooSmall = useMemo(() => {
    switch (true) {
      case isBelowMinSellAmount:
      case feesExceedsSellAmount:
        return true
      default:
        return false
    }
  }, [isBelowMinSellAmount, feesExceedsSellAmount])

  const {
    isOpen: isSellAssetSearchModalOpen,
    onOpen: onOpenSellAssetSearchModal,
    onClose: handleCloseSellAssetSearchModal,
  } = useDisclosure()
  const {
    isOpen: isBuyAssetSearchModalOpen,
    onOpen: onOpenBuyAssetSearchModal,
    onClose: handleCloseBuyAssetSearchModal,
  } = useDisclosure()

  const handleSellAssetClick = useCallback(() => {
    handleAssetClick(sellAsset, AssetClickAction.Sell)
    onOpenSellAssetSearchModal()
  }, [sellAsset, handleAssetClick, onOpenSellAssetSearchModal])

  const handleBuyAssetClick = useCallback(() => {
    handleAssetClick(buyAsset, AssetClickAction.Buy)
    onOpenBuyAssetSearchModal()
  }, [buyAsset, handleAssetClick, onOpenBuyAssetSearchModal])

  const tradeStateLoading = useMemo(
    () => (isSwapperApiPending && !quoteAvailableForCurrentAssetPair) || !isSwapperApiInitiated,
    [isSwapperApiPending, quoteAvailableForCurrentAssetPair, isSwapperApiInitiated],
  )

  const isSellAction = useMemo(() => {
    return (
      action === TradeAmountInputField.SELL_CRYPTO || action === TradeAmountInputField.SELL_FIAT
    )
  }, [action])

  const receiveAmountLoading = useMemo(
    () => isSwapperApiPending && isSellAction,
    [isSwapperApiPending, isSellAction],
  )

  return (
    <>
      <SlideTransition>
        <Stack spacing={6} as='form' onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={2}>
            <Flex alignItems='center' flexDir={{ base: 'column', md: 'row' }} width='full'>
              <TradeAssetSelect
                accountId={sellAssetAccountId}
                onAccountIdChange={handleSellAccountIdChange}
                assetId={sellAsset?.assetId}
                onAssetClick={handleSellAssetClick}
                label={translate('trade.from')}
              />
              <IconButton
                onClick={handleSwitchAssets}
                isRound
                mx={{ base: 0, md: -3 }}
                my={{ base: -3, md: 0 }}
                size='sm'
                position='relative'
                borderColor={useColorModeValue('gray.100', 'gray.750')}
                borderWidth={1}
                boxShadow={`0 0 0 3px var(${useColorModeValue(
                  '--chakra-colors-white',
                  '--chakra-colors-gray-785',
                )})`}
                bg={useColorModeValue('white', 'gray.850')}
                zIndex={1}
                aria-label='Switch Assets'
                icon={isLargerThanMd ? <ArrowForwardIcon /> : <ArrowDownIcon />}
              />
              <TradeAssetSelect
                accountId={buyAssetAccountId}
                assetId={buyAsset?.assetId}
                onAssetClick={handleBuyAssetClick}
                onAccountIdChange={handleBuyAccountIdChange}
                accountSelectionDisabled={!swapperSupportsCrossAccountTrade}
                label={translate('trade.to')}
              />
            </Flex>
            <TradeAssetInput
              accountId={sellAssetAccountId}
              assetId={sellAsset?.assetId}
              assetSymbol={sellAsset?.symbol ?? ''}
              assetIcon={sellAsset?.icon ?? ''}
              cryptoAmount={positiveOrZero(sellAmountCryptoPrecision).toString()}
              fiatAmount={positiveOrZero(fiatSellAmount).toFixed(2)}
              isSendMaxDisabled={tradeStateLoading}
              onChange={onSellAssetInputChange}
              percentOptions={[1]}
              onPercentOptionClick={handleSendMax}
              showInputSkeleton={isSwapperApiPending && isSendMax}
              showFiatSkeleton={isUsdRatesPending || (isSwapperApiPending && isSendMax)}
              label={translate('trade.youPay')}
            />
            <TradeAssetInput
              isReadOnly={true}
              accountId={buyAssetAccountId}
              assetId={buyAsset?.assetId}
              assetSymbol={buyAsset?.symbol ?? ''}
              assetIcon={buyAsset?.icon ?? ''}
              cryptoAmount={positiveOrZero(buyAmountCryptoPrecision).toString()}
              fiatAmount={positiveOrZero(fiatBuyAmount).toFixed(2)}
              onChange={onBuyAssetInputChange}
              percentOptions={[1]}
              showInputSkeleton={receiveAmountLoading}
              showFiatSkeleton={receiveAmountLoading}
              label={translate('trade.youGet')}
              rightRegion={
                isTradeRatesEnabled ? (
                  <IconButton
                    size='sm'
                    icon={showQuotes ? <ArrowUpIcon /> : <ArrowDownIcon />}
                    aria-label='Expand Quotes'
                    onClick={toggleShowQuotes}
                  />
                ) : (
                  <></>
                )
              }
            >
              {isTradeRatesEnabled && (
                <TradeQuotes isOpen={showQuotes} isLoading={tradeStateLoading} />
              )}
            </TradeAssetInput>
          </Stack>
          <Stack boxShadow='sm' p={4} borderColor={borderColor} borderRadius='xl' borderWidth={1}>
            <RateGasRow
              sellSymbol={sellAsset?.symbol}
              buySymbol={buyAsset?.symbol}
              gasFee={gasFeeFiat}
              rate={activeQuote?.rate}
              isLoading={tradeStateLoading}
              isError={!walletSupportsTradeAssetChains}
            />
            {walletSupportsTradeAssetChains && !sellAmountTooSmall ? (
              <ReceiveSummary
                isLoading={tradeStateLoading}
                symbol={buyAsset?.symbol ?? ''}
                amount={buyAmountCryptoPrecision ?? ''}
                beforeFees={quoteBuyAmountCryptoPrecision ?? ''}
                protocolFee={totalTradeFeeBuyAssetCryptoPrecision ?? ''}
                shapeShiftFee='0'
                slippage={slippage}
                swapperName={swapperName}
              />
            ) : null}
          </Stack>
          <Button
            type='submit'
            colorScheme={hasError ? 'red' : 'blue'}
            size='lg-multiline'
            data-test='trade-form-preview-button'
            isDisabled={hasError || isSwapperApiPending || !hasValidSellAmount || !activeQuote}
            isLoading={isLoading}
          >
            <Text translation={getErrorTranslationKey()} />
          </Button>
        </Stack>
      </SlideTransition>
      <AssetSearchModal
        assets={supportedSellAssetsByMarketCap}
        isOpen={isSellAssetSearchModalOpen}
        title='trade.tradeFrom'
        onClick={handleSellAssetClick}
        onClose={handleCloseSellAssetSearchModal}
      />
      <AssetSearchModal
        assets={supportedBuyAssetsByMarketCap}
        isOpen={isBuyAssetSearchModalOpen}
        title='trade.tradeTo'
        onClick={handleBuyAssetClick}
        onClose={handleCloseBuyAssetSearchModal}
      />
    </>
  )
}
