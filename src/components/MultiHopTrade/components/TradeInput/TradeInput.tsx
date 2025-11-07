import { useMediaQuery } from '@chakra-ui/react'
import { QueryStatus, skipToken } from '@reduxjs/toolkit/query'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import type { ThorTradeQuote } from '@shapeshiftoss/swapper'
import { isArbitrumBridgeTradeQuoteOrRate, SwapperName } from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { positiveOrZero } from '@shapeshiftoss/utils'
import type { FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { useAccountIds } from '../../hooks/useAccountIds'
import { useGetTradeRateInput } from '../../hooks/useGetTradeRateInput'
import { SharedTradeInput } from '../SharedTradeInput/SharedTradeInput'
import { SharedTradeInputBody } from '../SharedTradeInput/SharedTradeInputBody'
import { TradeAssetInput } from '../TradeAssetInput'
import { ArbitrumBridgeAcknowledgement } from './components/ArbitrumBridgeAcknowledgement'
import { CollapsibleQuoteList } from './components/CollapsibleQuoteList'
import { ConfirmSummary } from './components/ConfirmSummary'
import { HighlightedTokens } from './components/HighlightedTokens'
import { StreamingAcknowledgement } from './components/StreamingAcknowledgement'
import { TradeSettingsMenu } from './components/TradeSettingsMenu'
import { useTradeReceiveAddress } from './hooks/useTradeReceiveAddress'

import { WarningAcknowledgement } from '@/components/Acknowledgement/WarningAcknowledgement'
import { TradeAssetSelect } from '@/components/AssetSelection/AssetSelection'
import { useMixpanel } from '@/components/MultiHopTrade/components/TradeConfirm/hooks/useMixpanel'
import { TradeInputTab } from '@/components/MultiHopTrade/types'
import { WalletActions } from '@/context/WalletProvider/actions'
import { useErrorToast } from '@/hooks/useErrorToast/useErrorToast'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useModal } from '@/hooks/useModal/useModal'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { useWalletSupportsChain } from '@/hooks/useWalletSupportsChain/useWalletSupportsChain'
import { fromBaseUnit } from '@/lib/math'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import { useGetTradeRatesQuery } from '@/state/apis/swapper/swapperApi'
import type { ApiQuote } from '@/state/apis/swapper/types'
import {
  selectIsAnyGetAccountPortfolioLoadedForChainId,
  selectUsdRateByAssetId,
  selectWalletId,
} from '@/state/slices/selectors'
import {
  selectHasUserEnteredAmount,
  selectInputBuyAsset,
  selectInputSellAmountCryptoBaseUnit,
  selectInputSellAmountCryptoPrecision,
  selectInputSellAmountUserCurrency,
  selectInputSellAsset,
  selectIsInputtingFiatSellAmount,
  selectSelectedBuyAssetChainId,
  selectSelectedSellAssetChainId,
} from '@/state/slices/tradeInputSlice/selectors'
import { tradeInput } from '@/state/slices/tradeInputSlice/tradeInputSlice'
import {
  selectActiveQuote,
  selectActiveQuoteMeta,
  selectBuyAmountAfterFeesCryptoPrecision,
  selectBuyAmountAfterFeesUserCurrency,
  selectFirstHop,
  selectIsUnsafeActiveQuote,
  selectSortedTradeQuotes,
  selectUserAvailableTradeQuotes,
  selectUserUnavailableTradeQuotes,
} from '@/state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from '@/state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { store, useAppDispatch, useAppSelector } from '@/state/store'
import { breakpoints } from '@/theme/theme'

const emptyPercentOptions: number[] = []
const formControlProps = {
  borderRadius: 0,
  background: 'transparent',
  borderWidth: 0,
}

const STREAM_ACKNOWLEDGEMENT_MINIMUM_TIME_THRESHOLD = 1_000 * 60 * 5

type TradeInputProps = {
  tradeInputRef: React.MutableRefObject<HTMLDivElement | null>
  isCompact?: boolean
  isStandalone?: boolean
  onChangeTab: (newTab: TradeInputTab) => void
}

export const TradeInput = ({
  isCompact,
  isStandalone,
  tradeInputRef,
  onChangeTab,
}: TradeInputProps) => {
  const {
    dispatch: walletDispatch,
    state: { isConnected, wallet },
  } = useWallet()
  const [isSmallerThanMd] = useMediaQuery(`(max-width: ${breakpoints.md})`, { ssr: false })

  const { handleSubmit } = useFormContext()
  const dispatch = useAppDispatch()
  const translate = useTranslate()
  const trackMixpanelEvent = useMixpanel()
  const navigate = useNavigate()
  const { showErrorToast } = useErrorToast()
  const { sellAssetAccountId, buyAssetAccountId, setSellAssetAccountId, setBuyAssetAccountId } =
    useAccountIds()
  const buyAssetSearch = useModal('buyTradeAssetSearch')

  const isThorchainSwapperVolatilityAckEnabled = useFeatureFlag('ThorchainSwapperVolatilityAck')

  const [isConfirmationLoading, setIsConfirmationLoading] = useState(false)
  const [shouldShowWarningAcknowledgement, setShouldShowWarningAcknowledgement] = useState(false)
  const [shouldShowStreamingAcknowledgement, setShouldShowStreamingAcknowledgement] =
    useState(false)
  const [shouldShowArbitrumBridgeAcknowledgement, setShouldShowArbitrumBridgeAcknowledgement] =
    useState(false)
  const [
    shouldShowThorchainSwapperVolatilityAcknowledgement,
    setShouldShowThorchainSwapperVolatilityAcknowledgement,
  ] = useState(false)

  const activeQuoteMeta = useAppSelector(selectActiveQuoteMeta)
  const sellAmountCryptoPrecision = useAppSelector(selectInputSellAmountCryptoPrecision)
  const sellAmountUserCurrency = useAppSelector(selectInputSellAmountUserCurrency)
  const buyAmountAfterFeesCryptoPrecision = useAppSelector(selectBuyAmountAfterFeesCryptoPrecision)
  const buyAmountAfterFeesUserCurrency = useAppSelector(selectBuyAmountAfterFeesUserCurrency)
  const isInputtingFiatSellAmount = useAppSelector(selectIsInputtingFiatSellAmount)
  const hasUserEnteredAmount = useAppSelector(selectHasUserEnteredAmount)
  const tradeQuoteStep = useAppSelector(selectFirstHop)
  const isUnsafeQuote = useAppSelector(selectIsUnsafeActiveQuote)
  const sellAsset = useAppSelector(selectInputSellAsset)
  const buyAsset = useAppSelector(selectInputBuyAsset)
  const selectedSellAssetChainId = useAppSelector(selectSelectedSellAssetChainId)
  const selectedBuyAssetChainId = useAppSelector(selectSelectedBuyAssetChainId)
  const activeQuote = useAppSelector(selectActiveQuote)
  const sellInputAmountCryptoBaseUnit = useAppSelector(selectInputSellAmountCryptoBaseUnit)
  const availableTradeQuotesDisplayCache = useAppSelector(selectUserAvailableTradeQuotes)
  const unavailableTradeQuotesDisplayCache = useAppSelector(selectUserUnavailableTradeQuotes)
  const walletSupportsSellAssetChain = useWalletSupportsChain(sellAsset.chainId, wallet)
  const isAnyGetAccountPortfolioLoadedForChainIdFilter = useMemo(
    () => ({ chainId: sellAsset.chainId }),
    [sellAsset.chainId],
  )
  const isAnyGetAccountPortfolioLoadedForChainId = useAppSelector(state =>
    selectIsAnyGetAccountPortfolioLoadedForChainId(
      state,
      isAnyGetAccountPortfolioLoadedForChainIdFilter,
    ),
  )
  const walletId = useAppSelector(selectWalletId)

  const sellAssetUsdRate = useAppSelector(state => selectUsdRateByAssetId(state, sellAsset.assetId))
  const buyAssetUsdRate = useAppSelector(state => selectUsdRateByAssetId(state, buyAsset.assetId))

  const {
    manualReceiveAddress,
    walletReceiveAddress,
    isLoading: isWalletReceiveAddressLoading,
  } = useTradeReceiveAddress()

  const hasQuotes =
    availableTradeQuotesDisplayCache.length > 0 || unavailableTradeQuotesDisplayCache.length > 0

  const tradeRateInput = useGetTradeRateInput()
  const { status: rateQueryStatus } = useGetTradeRatesQuery(tradeRateInput ?? skipToken)

  const isLoading = useMemo(
    () =>
      // No account meta loaded for that chain for the sell asset (assuming wallet support)
      Boolean(
        walletId && walletSupportsSellAssetChain && !isAnyGetAccountPortfolioLoadedForChainId,
      ) ||
      (rateQueryStatus === QueryStatus.pending && !hasQuotes) ||
      isConfirmationLoading ||
      Boolean(walletId && isWalletReceiveAddressLoading),
    [
      hasQuotes,
      walletSupportsSellAssetChain,
      rateQueryStatus,
      walletId,
      isAnyGetAccountPortfolioLoadedForChainId,
      isConfirmationLoading,
      isWalletReceiveAddressLoading,
    ],
  )

  // Reset the trade quote slice to initial state on mount
  useEffect(() => {
    dispatch(tradeQuoteSlice.actions.clearTradeQuotes())
  }, [dispatch])

  useEffect(() => {
    // Reset the trade warning if the active quote has changed, i.e. a better quote has come in and the
    // user has not yet confirmed the previous one
    if (shouldShowWarningAcknowledgement) setShouldShowWarningAcknowledgement(false)
    // We also need to reset the streaming acknowledgement if the active quote has changed
    if (shouldShowStreamingAcknowledgement) setShouldShowStreamingAcknowledgement(false)
    if (shouldShowArbitrumBridgeAcknowledgement) setShouldShowArbitrumBridgeAcknowledgement(false)
    if (shouldShowThorchainSwapperVolatilityAcknowledgement)
      setShouldShowThorchainSwapperVolatilityAcknowledgement(false)
    // We need to ignore changes to shouldShowWarningAcknowledgement or this effect will react to itself
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeQuote])

  const isEstimatedExecutionTimeOverThreshold = useMemo(() => {
    if (!tradeQuoteStep?.estimatedExecutionTimeMs) return false

    if (tradeQuoteStep?.estimatedExecutionTimeMs >= STREAM_ACKNOWLEDGEMENT_MINIMUM_TIME_THRESHOLD)
      return true

    return false
  }, [tradeQuoteStep?.estimatedExecutionTimeMs])

  const warningAcknowledgementMessage = useMemo(() => {
    const recommendedMinimumCryptoBaseUnit = (activeQuote as ThorTradeQuote)
      ?.recommendedMinimumCryptoBaseUnit
    if (!recommendedMinimumCryptoBaseUnit) return translate('warningAcknowledgement.unsafeTrade')
    const recommendedMinimumCryptoPrecision = fromBaseUnit(
      recommendedMinimumCryptoBaseUnit,
      sellAsset.precision,
    )
    const message = translate('trade.errors.unsafeQuote', {
      symbol: sellAsset.symbol,
      recommendedMin: recommendedMinimumCryptoPrecision,
    })
    return message
  }, [activeQuote, sellAsset.precision, sellAsset.symbol, translate])

  const thorchainSwapperVolatilityAcknowledgementMessage = useMemo(() => {
    return translate('trade.thorchainSwapperVolatilityAcknowledgementMessage')
  }, [translate])

  const headerRightContent = useMemo(() => {
    return <TradeSettingsMenu isCompact={isCompact} />
  }, [isCompact])

  // Master effect syncing URL with state - note this is only done at trade input time
  // That's the only place we want things to be in sync, other routes should be a redirect
  useEffect(() => {
    if (isStandalone) return

    if (!(sellAsset.assetId && buyAsset.assetId)) return

    navigate(
      `/trade/${buyAsset.assetId}/${sellAsset.assetId}/${sellInputAmountCryptoBaseUnit ?? '0'}`,
      { replace: true }, // replace so we don't spew the history stack and make the back button actually work
    )
  }, [
    sellAsset.assetId,
    buyAsset.assetId,
    sellInputAmountCryptoBaseUnit,
    navigate,
    isStandalone,
    hasUserEnteredAmount,
  ])

  const setBuyAsset = useCallback(
    (asset: Asset) => dispatch(tradeInput.actions.setBuyAsset(asset)),
    [dispatch],
  )
  const setSellAsset = useCallback(
    (asset: Asset) => dispatch(tradeInput.actions.setSellAsset(asset)),
    [dispatch],
  )
  const handleSwitchAssets = useCallback(
    () => dispatch(tradeInput.actions.switchAssets({ sellAssetUsdRate, buyAssetUsdRate })),
    [buyAssetUsdRate, dispatch, sellAssetUsdRate],
  )

  const handleConnect = useCallback(() => {
    walletDispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  }, [walletDispatch])

  const onSubmit = useCallback(() => {
    // No preview happening if wallet isn't connected
    if (!isConnected) {
      return handleConnect()
    }

    setIsConfirmationLoading(true)
    try {
      trackMixpanelEvent(MixPanelEvent.TradePreview)

      if (!wallet) throw Error('missing wallet')
      if (!tradeQuoteStep) throw Error('missing tradeQuoteStep')
      if (!activeQuote) throw Error('missing activeQuote')

      const bestQuote: ApiQuote | undefined = selectSortedTradeQuotes(store.getState())[0]

      // Set the best quote as activeQuoteMeta, unless user has already a custom quote selected, in which case don't override it
      if (!activeQuoteMeta && bestQuote?.quote !== undefined && !bestQuote.errors.length) {
        dispatch(tradeQuoteSlice.actions.setActiveQuote(bestQuote))
      }

      console.log('[NEAR Debug] TradeInput setConfirmedQuote:', {
        quoteOrRate: activeQuote?.quoteOrRate,
        nearIntentsSpecific: activeQuote?.steps?.[0]?.nearIntentsSpecific,
      })
      // Only set confirmed quote if it's actually a quote (not a rate)
      // Rates don't have execution metadata like deposit addresses
      if (activeQuote.quoteOrRate === 'quote') {
        dispatch(tradeQuoteSlice.actions.setConfirmedQuote(activeQuote))
      }
      dispatch(tradeQuoteSlice.actions.clearQuoteExecutionState(activeQuote.id))

      if (isLedger(wallet)) {
        navigate('/trade/verify-addresses')
        setIsConfirmationLoading(false)
        return
      }

      navigate('/trade/confirm')
    } catch (e) {
      showErrorToast(e)
    }

    setIsConfirmationLoading(false)
  }, [
    activeQuote,
    activeQuoteMeta,
    dispatch,
    handleConnect,
    navigate,
    isConnected,
    trackMixpanelEvent,
    showErrorToast,
    tradeQuoteStep,
    wallet,
  ])

  const handleFormSubmit = useMemo(() => handleSubmit(onSubmit), [handleSubmit, onSubmit])

  // If the warning acknowledgement is shown, we need to handle the submit differently because we might want to show the streaming acknowledgement
  const handleWarningAcknowledgementSubmit = useCallback(() => {
    if (activeQuote?.isStreaming && isEstimatedExecutionTimeOverThreshold)
      return setShouldShowStreamingAcknowledgement(true)
    if (isArbitrumBridgeTradeQuoteOrRate(activeQuote) && activeQuote.direction === 'withdrawal')
      return setShouldShowArbitrumBridgeAcknowledgement(true)
    handleFormSubmit()
  }, [activeQuote, isEstimatedExecutionTimeOverThreshold, handleFormSubmit])

  const handleThorchainSwapperAcknowledgementSubmit = useCallback(() => {
    handleFormSubmit()
  }, [handleFormSubmit])

  const handleTradeQuoteConfirm = useCallback(
    (e: FormEvent<unknown>) => {
      e.preventDefault()
      if (isUnsafeQuote) return setShouldShowWarningAcknowledgement(true)
      if (activeQuote?.isStreaming && isEstimatedExecutionTimeOverThreshold)
        return setShouldShowStreamingAcknowledgement(true)
      if (isArbitrumBridgeTradeQuoteOrRate(activeQuote) && activeQuote.direction === 'withdrawal')
        return setShouldShowArbitrumBridgeAcknowledgement(true)
      if (
        isThorchainSwapperVolatilityAckEnabled &&
        (activeQuote?.swapperName === SwapperName.Thorchain ||
          activeQuote?.swapperName === SwapperName.Mayachain)
      ) {
        return setShouldShowThorchainSwapperVolatilityAcknowledgement(true)
      }
      handleFormSubmit()
    },
    [
      isUnsafeQuote,
      activeQuote,
      isEstimatedExecutionTimeOverThreshold,
      handleFormSubmit,
      isThorchainSwapperVolatilityAckEnabled,
    ],
  )

  const handleChangeSellAmountCryptoPrecision = useCallback(
    (sellAmountCryptoPrecision: string) => {
      dispatch(tradeInput.actions.setSellAmountCryptoPrecision(sellAmountCryptoPrecision))
    },
    [dispatch],
  )

  const handleIsInputtingFiatSellAmountChange = useCallback(
    (isInputtingFiatSellAmount: boolean) => {
      dispatch(tradeInput.actions.setIsInputtingFiatSellAmount(isInputtingFiatSellAmount))
    },
    [dispatch],
  )

  const isSolanaSwapperEnabled = useFeatureFlag('SolanaSwapper')
  const isMayaSwapEnabled = useFeatureFlag('MayaSwap')

  const assetFilterPredicate = useCallback(
    (assetId: AssetId) => {
      const { chainId } = fromAssetId(assetId)
      if (chainId === KnownChainIds.SolanaMainnet) return isSolanaSwapperEnabled
      if (chainId === KnownChainIds.MayachainMainnet) return isMayaSwapEnabled

      return true
    },
    [isSolanaSwapperEnabled, isMayaSwapEnabled],
  )

  const chainIdFilterPredicate = useCallback(
    (chainId: ChainId) => {
      if (chainId === KnownChainIds.SolanaMainnet) return isSolanaSwapperEnabled
      if (chainId === KnownChainIds.MayachainMainnet) return isMayaSwapEnabled

      return true
    },
    [isSolanaSwapperEnabled, isMayaSwapEnabled],
  )

  const setSelectedBuyAssetChainId = useCallback(
    (chainId: ChainId | 'All') => dispatch(tradeInput.actions.setSelectedBuyAssetChainId(chainId)),
    [dispatch],
  )

  const handleBuyAssetClick = useCallback(() => {
    buyAssetSearch.open({
      onAssetClick: setBuyAsset,
      title: 'trade.tradeTo',
      assetFilterPredicate,
      chainIdFilterPredicate,
      selectedChainId: selectedBuyAssetChainId,
      onSelectedChainIdChange: setSelectedBuyAssetChainId,
    })
  }, [
    assetFilterPredicate,
    buyAssetSearch,
    chainIdFilterPredicate,
    setBuyAsset,
    selectedBuyAssetChainId,
    setSelectedBuyAssetChainId,
  ])

  const setSelectedSellAssetChainId = useCallback(
    (chainId: ChainId | 'All') => dispatch(tradeInput.actions.setSelectedSellAssetChainId(chainId)),
    [dispatch],
  )

  const assetSelectButtonProps = useMemo(() => {
    return {
      maxWidth: isSmallerThanMd ? '100%' : undefined,
    }
  }, [isSmallerThanMd])

  const buyTradeAssetSelect = useMemo(
    () => (
      <TradeAssetSelect
        assetId={buyAsset.assetId}
        onAssetClick={handleBuyAssetClick}
        onAssetChange={setBuyAsset}
        onlyConnectedChains={false}
        assetFilterPredicate={assetFilterPredicate}
        chainIdFilterPredicate={chainIdFilterPredicate}
        showChainDropdown={!isSmallerThanMd}
        buttonProps={assetSelectButtonProps}
        mb={isSmallerThanMd ? 0 : 4}
      />
    ),
    [
      buyAsset.assetId,
      isSmallerThanMd,
      assetSelectButtonProps,
      handleBuyAssetClick,
      setBuyAsset,
      assetFilterPredicate,
      chainIdFilterPredicate,
    ],
  )

  const bodyContent = useMemo(() => {
    return (
      <SharedTradeInputBody
        buyAsset={buyAsset}
        sellAccountId={sellAssetAccountId}
        isInputtingFiatSellAmount={isInputtingFiatSellAmount}
        isLoading={isLoading}
        sellAsset={sellAsset}
        sellAmountCryptoPrecision={sellAmountCryptoPrecision}
        sellAmountUserCurrency={sellAmountUserCurrency}
        onSwitchAssets={handleSwitchAssets}
        setSellAsset={setSellAsset}
        setSellAccountId={setSellAssetAccountId}
        onChangeIsInputtingFiatSellAmount={handleIsInputtingFiatSellAmountChange}
        onChangeSellAmountCryptoPrecision={handleChangeSellAmountCryptoPrecision}
        assetFilterPredicate={assetFilterPredicate}
        chainIdFilterPredicate={chainIdFilterPredicate}
        selectedSellAssetChainId={selectedSellAssetChainId}
        onSellAssetChainIdChange={setSelectedSellAssetChainId}
        subContent={isSmallerThanMd && !hasUserEnteredAmount ? <HighlightedTokens /> : undefined}
      >
        <>
          <TradeAssetInput
            // Disable account selection when user set a manual receive address
            isAccountSelectionHidden={Boolean(manualReceiveAddress)}
            isReadOnly={true}
            accountId={buyAssetAccountId}
            assetId={buyAsset.assetId}
            assetSymbol={buyAsset.symbol}
            assetIcon={buyAsset.icon}
            cryptoAmount={
              hasUserEnteredAmount
                ? positiveOrZero(buyAmountAfterFeesCryptoPrecision).toFixed()
                : '0'
            }
            fiatAmount={
              hasUserEnteredAmount ? positiveOrZero(buyAmountAfterFeesUserCurrency).toFixed() : '0'
            }
            percentOptions={emptyPercentOptions}
            showInputSkeleton={isLoading}
            showFiatSkeleton={isLoading}
            label={translate('trade.youGet')}
            onAccountIdChange={setBuyAssetAccountId}
            formControlProps={formControlProps}
            labelPostFix={buyTradeAssetSelect}
            activeQuote={activeQuote}
          />
        </>
      </SharedTradeInputBody>
    )
  }, [
    buyAmountAfterFeesCryptoPrecision,
    buyAmountAfterFeesUserCurrency,
    buyAsset,
    buyAssetAccountId,
    buyTradeAssetSelect,
    hasUserEnteredAmount,
    isInputtingFiatSellAmount,
    isLoading,
    manualReceiveAddress,
    sellAmountCryptoPrecision,
    sellAmountUserCurrency,
    sellAsset,
    sellAssetAccountId,
    translate,
    assetFilterPredicate,
    chainIdFilterPredicate,
    handleChangeSellAmountCryptoPrecision,
    handleIsInputtingFiatSellAmountChange,
    handleSwitchAssets,
    setBuyAssetAccountId,
    setSellAsset,
    setSellAssetAccountId,
    selectedSellAssetChainId,
    setSelectedSellAssetChainId,
    activeQuote,
    isSmallerThanMd,
  ])

  const footerContent = useMemo(() => {
    if (isSmallerThanMd && !hasUserEnteredAmount) return null

    return (
      <ConfirmSummary
        isCompact={isCompact}
        isLoading={isLoading}
        receiveAddress={manualReceiveAddress ?? walletReceiveAddress}
      />
    )
  }, [
    isCompact,
    isLoading,
    isSmallerThanMd,
    manualReceiveAddress,
    walletReceiveAddress,
    hasUserEnteredAmount,
  ])

  // TODO: Its possible for multiple Acknowledgements to appear at once. Based on the logical paths,
  // if the WarningAcknowledgement shows, it can then show either StreamingAcknowledgement or
  // ArbitrumBridgeAcknowledgement, but never both. While the current implementation works, its by
  // accident and we should implement better control flow to handle this in a more robust way so if
  // we make any changes to these we aren't left in a broken state.
  return (
    <>
      <ArbitrumBridgeAcknowledgement
        onAcknowledge={handleFormSubmit}
        shouldShowAcknowledgement={Boolean(walletId && shouldShowArbitrumBridgeAcknowledgement)}
        setShouldShowAcknowledgement={setShouldShowArbitrumBridgeAcknowledgement}
      />
      <StreamingAcknowledgement
        onAcknowledge={handleFormSubmit}
        shouldShowAcknowledgement={Boolean(walletId && shouldShowStreamingAcknowledgement)}
        setShouldShowAcknowledgement={setShouldShowStreamingAcknowledgement}
        estimatedTimeMs={
          tradeQuoteStep?.estimatedExecutionTimeMs ? tradeQuoteStep.estimatedExecutionTimeMs : 0
        }
      />
      <WarningAcknowledgement
        message={warningAcknowledgementMessage}
        onAcknowledge={handleWarningAcknowledgementSubmit}
        shouldShowAcknowledgement={Boolean(walletId && shouldShowWarningAcknowledgement)}
        setShouldShowAcknowledgement={setShouldShowWarningAcknowledgement}
      />
      <WarningAcknowledgement
        message={thorchainSwapperVolatilityAcknowledgementMessage}
        onAcknowledge={handleThorchainSwapperAcknowledgementSubmit}
        shouldShowAcknowledgement={Boolean(
          walletId && shouldShowThorchainSwapperVolatilityAcknowledgement,
        )}
        setShouldShowAcknowledgement={setShouldShowThorchainSwapperVolatilityAcknowledgement}
      />
      <SharedTradeInput
        bodyContent={bodyContent}
        footerContent={footerContent}
        headerRightContent={headerRightContent}
        isCompact={isCompact}
        isLoading={isLoading}
        SideComponent={CollapsibleQuoteList}
        shouldOpenSideComponent={hasUserEnteredAmount}
        tradeInputRef={tradeInputRef}
        tradeInputTab={TradeInputTab.Trade}
        onSubmit={handleTradeQuoteConfirm}
        onChangeTab={onChangeTab}
        isStandalone={isStandalone}
      />
    </>
  )
}
