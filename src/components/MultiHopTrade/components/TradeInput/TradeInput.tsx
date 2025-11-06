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
import { useEffect, useState } from 'react'
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
  'use memo'
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
  const isAnyGetAccountPortfolioLoadedForChainIdFilter = { chainId: sellAsset.chainId }
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

  const isLoading =
    // No account meta loaded for that chain for the sell asset (assuming wallet support)
    Boolean(
      walletId && walletSupportsSellAssetChain && !isAnyGetAccountPortfolioLoadedForChainId,
    ) ||
    (rateQueryStatus === QueryStatus.pending && !hasQuotes) ||
    isConfirmationLoading ||
    Boolean(walletId && isWalletReceiveAddressLoading)

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

  const isEstimatedExecutionTimeOverThreshold = (() => {
    if (!tradeQuoteStep?.estimatedExecutionTimeMs) return false

    if (tradeQuoteStep?.estimatedExecutionTimeMs >= STREAM_ACKNOWLEDGEMENT_MINIMUM_TIME_THRESHOLD)
      return true

    return false
  })()

  const warningAcknowledgementMessage = (() => {
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
  })()

  const thorchainSwapperVolatilityAcknowledgementMessage = translate(
    'trade.thorchainSwapperVolatilityAcknowledgementMessage',
  )

  const headerRightContent = <TradeSettingsMenu isCompact={isCompact} />

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

  const setBuyAsset = (asset: Asset) => dispatch(tradeInput.actions.setBuyAsset(asset))
  const setSellAsset = (asset: Asset) => dispatch(tradeInput.actions.setSellAsset(asset))
  const handleSwitchAssets = () =>
    dispatch(tradeInput.actions.switchAssets({ sellAssetUsdRate, buyAssetUsdRate }))

  const handleConnect = () => {
    walletDispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  }

  const onSubmit = () => {
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

      dispatch(tradeQuoteSlice.actions.setConfirmedQuote(activeQuote))
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
  }

  const handleFormSubmit = handleSubmit(onSubmit)

  // If the warning acknowledgement is shown, we need to handle the submit differently because we might want to show the streaming acknowledgement
  const handleWarningAcknowledgementSubmit = () => {
    if (activeQuote?.isStreaming && isEstimatedExecutionTimeOverThreshold)
      return setShouldShowStreamingAcknowledgement(true)
    if (isArbitrumBridgeTradeQuoteOrRate(activeQuote) && activeQuote.direction === 'withdrawal')
      return setShouldShowArbitrumBridgeAcknowledgement(true)
    handleFormSubmit()
  }

  const handleThorchainSwapperAcknowledgementSubmit = () => {
    handleFormSubmit()
  }

  const handleTradeQuoteConfirm = (e: FormEvent<unknown>) => {
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
  }

  const handleChangeSellAmountCryptoPrecision = (sellAmountCryptoPrecision: string) => {
    dispatch(tradeInput.actions.setSellAmountCryptoPrecision(sellAmountCryptoPrecision))
  }

  const handleIsInputtingFiatSellAmountChange = (isInputtingFiatSellAmount: boolean) => {
    dispatch(tradeInput.actions.setIsInputtingFiatSellAmount(isInputtingFiatSellAmount))
  }

  const isSolanaSwapperEnabled = useFeatureFlag('SolanaSwapper')
  const isMayaSwapEnabled = useFeatureFlag('MayaSwap')

  const assetFilterPredicate = (assetId: AssetId) => {
    const { chainId } = fromAssetId(assetId)
    if (chainId === KnownChainIds.SolanaMainnet) return isSolanaSwapperEnabled
    if (chainId === KnownChainIds.MayachainMainnet) return isMayaSwapEnabled

    return true
  }

  const chainIdFilterPredicate = (chainId: ChainId) => {
    if (chainId === KnownChainIds.SolanaMainnet) return isSolanaSwapperEnabled
    if (chainId === KnownChainIds.MayachainMainnet) return isMayaSwapEnabled

    return true
  }

  const setSelectedBuyAssetChainId = (chainId: ChainId | 'All') =>
    dispatch(tradeInput.actions.setSelectedBuyAssetChainId(chainId))

  const handleBuyAssetClick = () => {
    buyAssetSearch.open({
      onAssetClick: setBuyAsset,
      title: 'trade.tradeTo',
      assetFilterPredicate,
      chainIdFilterPredicate,
      selectedChainId: selectedBuyAssetChainId,
      onSelectedChainIdChange: setSelectedBuyAssetChainId,
    })
  }

  const setSelectedSellAssetChainId = (chainId: ChainId | 'All') =>
    dispatch(tradeInput.actions.setSelectedSellAssetChainId(chainId))

  const assetSelectButtonProps = {
    maxWidth: isSmallerThanMd ? '100%' : undefined,
  }

  const buyTradeAssetSelect = (
    <TradeAssetSelect
      assetId={buyAsset.assetId}
      // React Compiler now handles memoization automagically here
      // eslint-disable-next-line react-memo/require-usememo
      onAssetClick={handleBuyAssetClick}
      // React Compiler now handles memoization automagically here
      // eslint-disable-next-line react-memo/require-usememo
      onAssetChange={setBuyAsset}
      onlyConnectedChains={false}
      // React Compiler now handles memoization automagically here
      // eslint-disable-next-line react-memo/require-usememo
      assetFilterPredicate={assetFilterPredicate}
      // React Compiler now handles memoization automagically here
      // eslint-disable-next-line react-memo/require-usememo
      chainIdFilterPredicate={chainIdFilterPredicate}
      showChainDropdown={!isSmallerThanMd}
      // React Compiler now handles memoization automagically here
      // eslint-disable-next-line react-memo/require-usememo
      buttonProps={assetSelectButtonProps}
      mb={isSmallerThanMd ? 0 : 4}
    />
  )

  const bodyContent = (
    <SharedTradeInputBody
      buyAsset={buyAsset}
      sellAccountId={sellAssetAccountId}
      isInputtingFiatSellAmount={isInputtingFiatSellAmount}
      isLoading={isLoading}
      sellAsset={sellAsset}
      sellAmountCryptoPrecision={sellAmountCryptoPrecision}
      sellAmountUserCurrency={sellAmountUserCurrency}
      // React Compiler now handles memoization automagically here
      // eslint-disable-next-line react-memo/require-usememo
      onSwitchAssets={handleSwitchAssets}
      // React Compiler now handles memoization automagically here
      // eslint-disable-next-line react-memo/require-usememo
      setSellAsset={setSellAsset}
      setSellAccountId={setSellAssetAccountId}
      // React Compiler now handles memoization automagically here
      // eslint-disable-next-line react-memo/require-usememo
      onChangeIsInputtingFiatSellAmount={handleIsInputtingFiatSellAmountChange}
      // React Compiler now handles memoization automagically here
      // eslint-disable-next-line react-memo/require-usememo
      onChangeSellAmountCryptoPrecision={handleChangeSellAmountCryptoPrecision}
      // React Compiler now handles memoization automagically here
      // eslint-disable-next-line react-memo/require-usememo
      assetFilterPredicate={assetFilterPredicate}
      // React Compiler now handles memoization automagically here
      // eslint-disable-next-line react-memo/require-usememo
      chainIdFilterPredicate={chainIdFilterPredicate}
      selectedSellAssetChainId={selectedSellAssetChainId}
      // React Compiler now handles memoization automagically here
      // eslint-disable-next-line react-memo/require-usememo
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
            hasUserEnteredAmount ? positiveOrZero(buyAmountAfterFeesCryptoPrecision).toFixed() : '0'
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
          // React Compiler now handles memoization automagically here
          // eslint-disable-next-line react-memo/require-usememo
          labelPostFix={buyTradeAssetSelect}
          activeQuote={activeQuote}
        />
      </>
    </SharedTradeInputBody>
  )

  const footerContent = (() => {
    if (isSmallerThanMd && !hasUserEnteredAmount) return null

    return (
      <ConfirmSummary
        isCompact={isCompact}
        isLoading={isLoading}
        receiveAddress={manualReceiveAddress ?? walletReceiveAddress}
      />
    )
  })()

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
        // React Compiler now handles memoization automagically here
        // eslint-disable-next-line react-memo/require-usememo
        onAcknowledge={handleWarningAcknowledgementSubmit}
        shouldShowAcknowledgement={Boolean(walletId && shouldShowWarningAcknowledgement)}
        setShouldShowAcknowledgement={setShouldShowWarningAcknowledgement}
      />
      <WarningAcknowledgement
        message={thorchainSwapperVolatilityAcknowledgementMessage}
        // React Compiler now handles memoization automagically here
        // eslint-disable-next-line react-memo/require-usememo
        onAcknowledge={handleThorchainSwapperAcknowledgementSubmit}
        shouldShowAcknowledgement={Boolean(
          walletId && shouldShowThorchainSwapperVolatilityAcknowledgement,
        )}
        setShouldShowAcknowledgement={setShouldShowThorchainSwapperVolatilityAcknowledgement}
      />
      <SharedTradeInput
        // React Compiler now handles memoization automagically here
        // eslint-disable-next-line react-memo/require-usememo
        bodyContent={bodyContent}
        footerContent={footerContent}
        // React Compiler now handles memoization automagically here
        // eslint-disable-next-line react-memo/require-usememo
        headerRightContent={headerRightContent}
        isCompact={isCompact}
        isLoading={isLoading}
        SideComponent={CollapsibleQuoteList}
        shouldOpenSideComponent={hasUserEnteredAmount}
        tradeInputRef={tradeInputRef}
        tradeInputTab={TradeInputTab.Trade}
        // React Compiler now handles memoization automagically here
        // eslint-disable-next-line react-memo/require-usememo
        onSubmit={handleTradeQuoteConfirm}
        onChangeTab={onChangeTab}
        isStandalone={isStandalone}
      />
    </>
  )
}
