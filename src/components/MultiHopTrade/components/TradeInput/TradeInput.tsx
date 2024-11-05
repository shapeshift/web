import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { isExecutableTradeQuote } from '@shapeshiftoss/swapper'
import { isArbitrumBridgeTradeQuote } from '@shapeshiftoss/swapper/dist/swappers/ArbitrumBridgeSwapper/getTradeQuote/getTradeQuote'
import type { ThorTradeQuote } from '@shapeshiftoss/swapper/dist/swappers/ThorchainSwapper/getThorTradeQuoteOrRate/getTradeQuoteOrRate'
import type { Asset } from '@shapeshiftoss/types'
import { positiveOrZero } from '@shapeshiftoss/utils'
import type { FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import {
  ArbitrumBridgeAcknowledgement,
  StreamingAcknowledgement,
  WarningAcknowledgement,
} from 'components/Acknowledgement/Acknowledgement'
import { TradeAssetSelect } from 'components/AssetSelection/AssetSelection'
import { MessageOverlay } from 'components/MessageOverlay/MessageOverlay'
import { getMixpanelEventData } from 'components/MultiHopTrade/helpers'
import { useInputOutputDifferenceDecimalPercentage } from 'components/MultiHopTrade/hooks/useInputOutputDifference'
import { useReceiveAddress } from 'components/MultiHopTrade/hooks/useReceiveAddress'
import { TradeInputTab, TradeRoutePaths } from 'components/MultiHopTrade/types'
import { WalletActions } from 'context/WalletProvider/actions'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { ParameterModel } from 'lib/fees/parameters/types'
import { fromBaseUnit } from 'lib/math'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'
import { isKeplrHDWallet } from 'lib/utils'
import { selectIsSnapshotApiQueriesPending, selectVotingPower } from 'state/apis/snapshot/selectors'
import {
  selectHasUserEnteredAmount,
  selectInputBuyAsset,
  selectInputSellAmountCryptoPrecision,
  selectInputSellAmountUserCurrency,
  selectInputSellAsset,
  selectIsAnyAccountMetadataLoadedForChainId,
  selectIsInputtingFiatSellAmount,
} from 'state/slices/selectors'
import { tradeInput } from 'state/slices/tradeInputSlice/tradeInputSlice'
import {
  selectActiveQuote,
  selectBuyAmountAfterFeesCryptoPrecision,
  selectBuyAmountAfterFeesUserCurrency,
  selectFirstHop,
  selectIsTradeQuoteRequestAborted,
  selectIsUnsafeActiveQuote,
  selectShouldShowTradeQuoteOrAwaitInput,
} from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

import { useAccountIds } from '../../hooks/useAccountIds'
import { SharedTradeInput } from '../SharedTradeInput/SharedTradeInput'
import { SharedTradeInputBody } from '../SharedTradeInput/SharedTradeInputBody'
import { TradeAssetInput } from '../TradeAssetInput'
import { CollapsibleQuoteList } from './components/CollapsibleQuoteList'
import { ConfirmSummary } from './components/ConfirmSummary'
import { TradeSettingsMenu } from './components/TradeSettingsMenu'

const votingPowerParams: { feeModel: ParameterModel } = { feeModel: 'SWAPPER' }
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
  const { showErrorToast } = useErrorHandler()
  const { manualReceiveAddress, walletReceiveAddress } = useReceiveAddress({
    fetchUnchainedAddress: Boolean(wallet && isLedger(wallet)),
  })
  const { sellAssetAccountId, buyAssetAccountId, setSellAssetAccountId, setBuyAssetAccountId } =
    useAccountIds()
  const buyAssetSearch = useModal('buyTradeAssetSearch')

  const [isConfirmationLoading, setIsConfirmationLoading] = useState(false)
  const [shouldShowWarningAcknowledgement, setShouldShowWarningAcknowledgement] = useState(false)
  const [shouldShowStreamingAcknowledgement, setShouldShowStreamingAcknowledgement] =
    useState(false)
  const [shouldShowArbitrumBridgeAcknowledgement, setShouldShowArbitrumBridgeAcknowledgement] =
    useState(false)

  const sellAmountCryptoPrecision = useAppSelector(selectInputSellAmountCryptoPrecision)
  const sellAmountUserCurrency = useAppSelector(selectInputSellAmountUserCurrency)
  const buyAmountAfterFeesCryptoPrecision = useAppSelector(selectBuyAmountAfterFeesCryptoPrecision)
  const buyAmountAfterFeesUserCurrency = useAppSelector(selectBuyAmountAfterFeesUserCurrency)
  const shouldShowTradeQuoteOrAwaitInput = useAppSelector(selectShouldShowTradeQuoteOrAwaitInput)
  const isSnapshotApiQueriesPending = useAppSelector(selectIsSnapshotApiQueriesPending)
  const isTradeQuoteRequestAborted = useAppSelector(selectIsTradeQuoteRequestAborted)
  const isInputtingFiatSellAmount = useAppSelector(selectIsInputtingFiatSellAmount)
  const hasUserEnteredAmount = useAppSelector(selectHasUserEnteredAmount)
  const tradeQuoteStep = useAppSelector(selectFirstHop)
  const isUnsafeQuote = useAppSelector(selectIsUnsafeActiveQuote)
  const votingPower = useAppSelector(state => selectVotingPower(state, votingPowerParams))
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

  const inputOutputDifferenceDecimalPercentage =
    useInputOutputDifferenceDecimalPercentage(activeQuote)

  const isKeplr = useMemo(() => !!wallet && isKeplrHDWallet(wallet), [wallet])

  const isVotingPowerLoading = useMemo(
    () => isSnapshotApiQueriesPending && votingPower === undefined,
    [isSnapshotApiQueriesPending, votingPower],
  )

  const isLoading = useMemo(
    () =>
      // No account meta loaded for that chain
      !isAnyAccountMetadataLoadedForChainId ||
      (!shouldShowTradeQuoteOrAwaitInput && !isTradeQuoteRequestAborted) ||
      isConfirmationLoading ||
      // Only consider snapshot API queries as pending if we don't have voting power yet
      // if we do, it means we have persisted or cached (both stale) data, which is enough to let the user continue
      // as we are optimistic and don't want to be waiting for a potentially very long time for the snapshot API to respond
      isVotingPowerLoading,
    [
      isAnyAccountMetadataLoadedForChainId,
      shouldShowTradeQuoteOrAwaitInput,
      isTradeQuoteRequestAborted,
      isConfirmationLoading,
      isVotingPowerLoading,
    ],
  )

  const overlayTitle = useMemo(
    () => translate('trade.swappingComingSoonForWallet', { walletName: 'Keplr' }),
    [translate],
  )

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
    () => dispatch(tradeInput.actions.switchAssets()),
    [dispatch],
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

      dispatch(tradeQuoteSlice.actions.setConfirmedQuote(activeQuote))

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
    if (isArbitrumBridgeTradeQuote(activeQuote) && activeQuote.direction === 'withdrawal')
      return setShouldShowArbitrumBridgeAcknowledgement(true)
    handleFormSubmit()
  }, [activeQuote, isEstimatedExecutionTimeOverThreshold, handleFormSubmit])

  const handleTradeQuoteConfirm = useCallback(
    (e: FormEvent<unknown>) => {
      e.preventDefault()
      if (isUnsafeQuote) return setShouldShowWarningAcknowledgement(true)
      if (activeQuote?.isStreaming && isEstimatedExecutionTimeOverThreshold)
        return setShouldShowStreamingAcknowledgement(true)
      if (isArbitrumBridgeTradeQuote(activeQuote) && activeQuote.direction === 'withdrawal')
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

  const handleBuyAssetClick = useCallback(() => {
    buyAssetSearch.open({
      onAssetClick: setBuyAsset,
      title: 'trade.tradeTo',
    })
  }, [buyAssetSearch, setBuyAsset])

  const buyTradeAssetSelect = useMemo(
    () => (
      <TradeAssetSelect
        assetId={buyAsset.assetId}
        onAssetClick={handleBuyAssetClick}
        onAssetChange={setBuyAsset}
        onlyConnectedChains={false}
      />
    ),
    [buyAsset.assetId, handleBuyAssetClick, setBuyAsset],
  )

  const bodyContent = useMemo(() => {
    return (
      <SharedTradeInputBody
        buyAsset={buyAsset}
        sellAssetAccountId={sellAssetAccountId}
        isInputtingFiatSellAmount={isInputtingFiatSellAmount}
        isLoading={isLoading}
        sellAsset={sellAsset}
        sellAmountCryptoPrecision={sellAmountCryptoPrecision}
        sellAmountUserCurrency={sellAmountUserCurrency}
        handleSwitchAssets={handleSwitchAssets}
        setSellAsset={setSellAsset}
        setSellAssetAccountId={setSellAssetAccountId}
        onChangeIsInputtingFiatSellAmount={handleIsInputtingFiatSellAmountChange}
        onChangeSellAmountCryptoPrecision={handleChangeSellAmountCryptoPrecision}
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
    sellAssetAccountId,
    isInputtingFiatSellAmount,
    isLoading,
    manualReceiveAddress,
    sellAsset,
    sellAmountCryptoPrecision,
    sellAmountUserCurrency,
    hasUserEnteredAmount,
    translate,
    buyTradeAssetSelect,
    inputOutputDifferenceDecimalPercentage,
    handleSwitchAssets,
    setBuyAssetAccountId,
    setSellAsset,
    setSellAssetAccountId,
    handleIsInputtingFiatSellAmountChange,
    handleChangeSellAmountCryptoPrecision,
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
    <MessageOverlay show={isKeplr} title={overlayTitle}>
      <ArbitrumBridgeAcknowledgement
        onAcknowledge={handleFormSubmit}
        shouldShowAcknowledgement={shouldShowArbitrumBridgeAcknowledgement}
        setShouldShowAcknowledgement={setShouldShowArbitrumBridgeAcknowledgement}
      />
      <StreamingAcknowledgement
        onAcknowledge={handleFormSubmit}
        shouldShowAcknowledgement={shouldShowStreamingAcknowledgement}
        setShouldShowAcknowledgement={setShouldShowStreamingAcknowledgement}
        estimatedTimeMs={
          tradeQuoteStep?.estimatedExecutionTimeMs ? tradeQuoteStep.estimatedExecutionTimeMs : 0
        }
      />
      <WarningAcknowledgement
        message={warningAcknowledgementMessage}
        onAcknowledge={handleWarningAcknowledgementSubmit}
        shouldShowAcknowledgement={shouldShowWarningAcknowledgement}
        setShouldShowAcknowledgement={setShouldShowWarningAcknowledgement}
      />
      <SharedTradeInput
        bodyContent={bodyContent}
        footerContent={footerContent}
        shouldOpenSideComponent={hasUserEnteredAmount}
        headerRightContent={headerRightContent}
        isCompact={isCompact}
        isLoading={isLoading}
        sideComponent={CollapsibleQuoteList}
        tradeInputRef={tradeInputRef}
        tradeInputTab={TradeInputTab.Trade}
        onSubmit={handleTradeQuoteConfirm}
        onChangeTab={onChangeTab}
      />
    </MessageOverlay>
  )
}
