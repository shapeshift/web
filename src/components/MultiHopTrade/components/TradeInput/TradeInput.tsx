import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { isArbitrumBridgeTradeQuoteOrRate } from '@shapeshiftoss/swapper/dist/swappers/ArbitrumBridgeSwapper/getTradeQuote/getTradeQuote'
import type { ThorTradeQuote } from '@shapeshiftoss/swapper/dist/swappers/ThorchainSwapper/types'
import type { Asset } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { positiveOrZero } from '@shapeshiftoss/utils'
import type { Location } from 'history'
import type { FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { WarningAcknowledgement } from 'components/Acknowledgement/WarningAcknowledgement'
import { TradeAssetSelect } from 'components/AssetSelection/AssetSelection'
import { getMixpanelEventData } from 'components/MultiHopTrade/helpers'
import { useInputOutputDifferenceDecimalPercentage } from 'components/MultiHopTrade/hooks/useInputOutputDifference'
import { TradeInputTab, TradeRoutePaths } from 'components/MultiHopTrade/types'
import { WalletActions } from 'context/WalletProvider/actions'
import { useErrorToast } from 'hooks/useErrorToast/useErrorToast'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { fromBaseUnit } from 'lib/math'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'
import { selectIsVotingPowerLoading } from 'state/apis/snapshot/selectors'
import type { ApiQuote } from 'state/apis/swapper/types'
import {
  selectIsAnyAccountMetadataLoadedForChainId,
  selectUsdRateByAssetId,
  selectWalletId,
} from 'state/slices/selectors'
import {
  selectHasUserEnteredAmount,
  selectInputBuyAsset,
  selectInputSellAmountCryptoPrecision,
  selectInputSellAmountUserCurrency,
  selectInputSellAsset,
  selectIsInputtingFiatSellAmount,
} from 'state/slices/tradeInputSlice/selectors'
import { tradeInput } from 'state/slices/tradeInputSlice/tradeInputSlice'
import {
  selectActiveQuote,
  selectActiveQuoteMeta,
  selectBuyAmountAfterFeesCryptoPrecision,
  selectBuyAmountAfterFeesUserCurrency,
  selectFirstHop,
  selectIsTradeQuoteRequestAborted,
  selectIsUnsafeActiveQuote,
  selectShouldShowTradeQuoteOrAwaitInput,
  selectSortedTradeQuotes,
} from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { store, useAppDispatch, useAppSelector } from 'state/store'

import { useAccountIds } from '../../hooks/useAccountIds'
import { SharedTradeInput } from '../SharedTradeInput/SharedTradeInput'
import { SharedTradeInputBody } from '../SharedTradeInput/SharedTradeInputBody'
import { TradeAssetInput } from '../TradeAssetInput'
import { ArbitrumBridgeAcknowledgement } from './components/ArbitrumBridgeAcknowledgement'
import { CollapsibleQuoteList } from './components/CollapsibleQuoteList'
import { ConfirmSummary } from './components/ConfirmSummary'
import { StreamingAcknowledgement } from './components/StreamingAcknowledgement'
import { TradeSettingsMenu } from './components/TradeSettingsMenu'
import { useTradeReceiveAddress } from './hooks/useTradeReceiveAddress'

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
  onChangeTab: (newTab: TradeInputTab) => void
}

export const TradeInput = ({ isCompact, tradeInputRef, onChangeTab }: TradeInputProps) => {
  const {
    dispatch: walletDispatch,
    state: { isConnected, isDemoWallet, wallet },
  } = useWallet()

  const { handleSubmit } = useFormContext()
  const dispatch = useAppDispatch()
  const translate = useTranslate()
  const mixpanel = getMixPanel()
  const history = useHistory()
  const { showErrorToast } = useErrorToast()
  const { sellAssetAccountId, buyAssetAccountId, setSellAssetAccountId, setBuyAssetAccountId } =
    useAccountIds()
  const buyAssetSearch = useModal('buyTradeAssetSearch')

  const [isConfirmationLoading, setIsConfirmationLoading] = useState(false)
  const [shouldShowWarningAcknowledgement, setShouldShowWarningAcknowledgement] = useState(false)
  const [shouldShowStreamingAcknowledgement, setShouldShowStreamingAcknowledgement] =
    useState(false)
  const [shouldShowArbitrumBridgeAcknowledgement, setShouldShowArbitrumBridgeAcknowledgement] =
    useState(false)

  const activeQuoteMeta = useAppSelector(selectActiveQuoteMeta)
  const sellAmountCryptoPrecision = useAppSelector(selectInputSellAmountCryptoPrecision)
  const sellAmountUserCurrency = useAppSelector(selectInputSellAmountUserCurrency)
  const buyAmountAfterFeesCryptoPrecision = useAppSelector(selectBuyAmountAfterFeesCryptoPrecision)
  const buyAmountAfterFeesUserCurrency = useAppSelector(selectBuyAmountAfterFeesUserCurrency)
  const shouldShowTradeQuoteOrAwaitInput = useAppSelector(selectShouldShowTradeQuoteOrAwaitInput)
  const isTradeQuoteRequestAborted = useAppSelector(selectIsTradeQuoteRequestAborted)
  const isInputtingFiatSellAmount = useAppSelector(selectIsInputtingFiatSellAmount)
  const hasUserEnteredAmount = useAppSelector(selectHasUserEnteredAmount)
  const tradeQuoteStep = useAppSelector(selectFirstHop)
  const isUnsafeQuote = useAppSelector(selectIsUnsafeActiveQuote)
  const sellAsset = useAppSelector(selectInputSellAsset)
  const buyAsset = useAppSelector(selectInputBuyAsset)
  const activeQuote = useAppSelector(selectActiveQuote)
  const isAnyAccountMetadataLoadedForChainIdFilter = useMemo(
    () => ({ chainId: sellAsset.chainId }),
    [sellAsset.chainId],
  )
  const isAnyAccountMetadataLoadedForChainId = useAppSelector(state =>
    selectIsAnyAccountMetadataLoadedForChainId(state, isAnyAccountMetadataLoadedForChainIdFilter),
  )
  const walletId = useAppSelector(selectWalletId)

  const sellAssetUsdRate = useAppSelector(state => selectUsdRateByAssetId(state, sellAsset.assetId))
  const buyAssetUsdRate = useAppSelector(state => selectUsdRateByAssetId(state, buyAsset.assetId))

  const inputOutputDifferenceDecimalPercentage =
    useInputOutputDifferenceDecimalPercentage(activeQuote)

  const {
    manualReceiveAddress,
    walletReceiveAddress,
    isLoading: isWalletReceiveAddressLoading,
  } = useTradeReceiveAddress()

  const isVotingPowerLoading = useAppSelector(selectIsVotingPowerLoading)

  const isLoading = useMemo(
    () =>
      // No account meta loaded for that chain
      Boolean(walletId && !isAnyAccountMetadataLoadedForChainId) ||
      (!shouldShowTradeQuoteOrAwaitInput && !isTradeQuoteRequestAborted) ||
      isConfirmationLoading ||
      // Only consider snapshot API queries as pending if we don't have voting power yet
      // if we do, it means we have persisted or cached (both stale) data, which is enough to let the user continue
      // as we are optimistic and don't want to be waiting for a potentially very long time for the snapshot API to respond
      isVotingPowerLoading ||
      Boolean(walletId && isWalletReceiveAddressLoading),
    [
      walletId,
      isAnyAccountMetadataLoadedForChainId,
      shouldShowTradeQuoteOrAwaitInput,
      isTradeQuoteRequestAborted,
      isConfirmationLoading,
      isVotingPowerLoading,
      isWalletReceiveAddressLoading,
    ],
  )

  // Reset the trade quote slice to initial state on mount
  useEffect(() => {
    // history.entries isn't officially documented but it exists
    const entries = (history as any).entries as Location[]
    const previousHistoryIndex = entries.length - 2
    // Do not clear tradeQuoteSlice when navigating back from trade quotes list, or selecting a quote other than the default will reset the slice and break swapper until user changes input
    if (entries.length > 1 && entries[previousHistoryIndex].pathname === TradeRoutePaths.QuoteList)
      return

    dispatch(tradeQuoteSlice.actions.clearTradeQuotes())
  }, [dispatch, history])

  useEffect(() => {
    // Reset the trade warning if the active quote has changed, i.e. a better quote has come in and the
    // user has not yet confirmed the previous one
    if (shouldShowWarningAcknowledgement) setShouldShowWarningAcknowledgement(false)
    // We also need to reset the streaming acknowledgement if the active quote has changed
    if (shouldShowStreamingAcknowledgement) setShouldShowStreamingAcknowledgement(false)
    if (shouldShowArbitrumBridgeAcknowledgement) setShouldShowArbitrumBridgeAcknowledgement(false)
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

  const headerRightContent = useMemo(() => {
    return <TradeSettingsMenu isLoading={isLoading} isCompact={isCompact} />
  }, [isCompact, isLoading])

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
    // No preview happening if wallet isn't connected i.e is using the demo wallet
    if (!isConnected || isDemoWallet) {
      return handleConnect()
    }

    setIsConfirmationLoading(true)
    try {
      const eventData = getMixpanelEventData()
      if (mixpanel && eventData) {
        mixpanel.track(MixPanelEvent.TradePreview, eventData)
      }

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
        history.push({ pathname: TradeRoutePaths.VerifyAddresses })
        setIsConfirmationLoading(false)
        return
      }

      history.push({ pathname: TradeRoutePaths.Confirm })
    } catch (e) {
      showErrorToast(e)
    }

    setIsConfirmationLoading(false)
  }, [
    activeQuote,
    activeQuoteMeta,
    dispatch,
    handleConnect,
    history,
    isConnected,
    isDemoWallet,
    mixpanel,
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

  const handleTradeQuoteConfirm = useCallback(
    (e: FormEvent<unknown>) => {
      e.preventDefault()
      if (isUnsafeQuote) return setShouldShowWarningAcknowledgement(true)
      if (activeQuote?.isStreaming && isEstimatedExecutionTimeOverThreshold)
        return setShouldShowStreamingAcknowledgement(true)
      if (isArbitrumBridgeTradeQuoteOrRate(activeQuote) && activeQuote.direction === 'withdrawal')
        return setShouldShowArbitrumBridgeAcknowledgement(true)

      handleFormSubmit()
    },
    [isUnsafeQuote, activeQuote, isEstimatedExecutionTimeOverThreshold, handleFormSubmit],
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
  const assetFilterPredicate = useCallback(
    (assetId: AssetId) => {
      const { chainId } = fromAssetId(assetId)
      if (chainId === KnownChainIds.SolanaMainnet) return isSolanaSwapperEnabled

      return true
    },
    [isSolanaSwapperEnabled],
  )

  const chainIdFilterPredicate = useCallback(
    (chainId: ChainId) => {
      if (chainId === KnownChainIds.SolanaMainnet) return isSolanaSwapperEnabled

      return true
    },
    [isSolanaSwapperEnabled],
  )

  const handleBuyAssetClick = useCallback(() => {
    buyAssetSearch.open({
      onAssetClick: setBuyAsset,
      title: 'trade.tradeTo',
      assetFilterPredicate,
      chainIdFilterPredicate,
    })
  }, [assetFilterPredicate, buyAssetSearch, chainIdFilterPredicate, setBuyAsset])

  const buyTradeAssetSelect = useMemo(
    () => (
      <TradeAssetSelect
        assetId={buyAsset.assetId}
        onAssetClick={handleBuyAssetClick}
        onAssetChange={setBuyAsset}
        onlyConnectedChains={false}
        assetFilterPredicate={assetFilterPredicate}
        chainIdFilterPredicate={chainIdFilterPredicate}
      />
    ),
    [
      buyAsset.assetId,
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
      >
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
          labelPostFix={buyTradeAssetSelect}
          inputOutputDifferenceDecimalPercentage={inputOutputDifferenceDecimalPercentage}
        />
      </SharedTradeInputBody>
    )
  }, [
    buyAmountAfterFeesCryptoPrecision,
    buyAmountAfterFeesUserCurrency,
    buyAsset,
    buyAssetAccountId,
    buyTradeAssetSelect,
    hasUserEnteredAmount,
    inputOutputDifferenceDecimalPercentage,
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
  ])

  const footerContent = useMemo(() => {
    return (
      <ConfirmSummary
        isCompact={isCompact}
        isLoading={isLoading}
        receiveAddress={manualReceiveAddress ?? walletReceiveAddress}
      />
    )
  }, [isCompact, isLoading, manualReceiveAddress, walletReceiveAddress])

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
      />
    </>
  )
}
