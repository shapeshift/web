import { ArrowDownIcon } from '@chakra-ui/icons'
import {
  Card,
  CardHeader,
  Center,
  CircularProgress,
  CircularProgressLabel,
  Divider,
  Flex,
  IconButton,
  Stack,
  useMediaQuery,
} from '@chakra-ui/react'
import { fromAssetId } from '@shapeshiftoss/caip'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { DEFAULT_GET_TRADE_QUOTE_POLLING_INTERVAL, swappers } from '@shapeshiftoss/swapper'
import { isArbitrumBridgeTradeQuote } from '@shapeshiftoss/swapper/dist/swappers/ArbitrumBridgeSwapper/getTradeQuote/getTradeQuote'
import type { ThorTradeQuote } from '@shapeshiftoss/swapper/dist/swappers/ThorchainSwapper/getThorTradeQuote/getTradeQuote'
import { type Asset } from '@shapeshiftoss/types'
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
import { SlippagePopover } from 'components/MultiHopTrade/components/SlippagePopover'
import { TradeAssetInput } from 'components/MultiHopTrade/components/TradeAssetInput'
import { getMixpanelEventData } from 'components/MultiHopTrade/helpers'
import { usePriceImpact } from 'components/MultiHopTrade/hooks/quoteValidation/usePriceImpact'
import { useReceiveAddress } from 'components/MultiHopTrade/hooks/useReceiveAddress'
import { TradeSlideTransition } from 'components/MultiHopTrade/TradeSlideTransition'
import { TradeRoutePaths } from 'components/MultiHopTrade/types'
import { WalletActions } from 'context/WalletProvider/actions'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useWalletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { positiveOrZero } from 'lib/bignumber/bignumber'
import type { ParameterModel } from 'lib/fees/parameters/types'
import { fromBaseUnit } from 'lib/math'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'
import { isKeplrHDWallet, isToken } from 'lib/utils'
import { selectIsSnapshotApiQueriesPending, selectVotingPower } from 'state/apis/snapshot/selectors'
import { selectIsTradeQuoteApiQueryPending } from 'state/apis/swapper/selectors'
import {
  selectHasUserEnteredAmount,
  selectHighestMarketCapFeeAsset,
  selectInputBuyAsset,
  selectInputSellAsset,
  selectWalletConnectedChainIds,
} from 'state/slices/selectors'
import { tradeInput } from 'state/slices/tradeInputSlice/tradeInputSlice'
import {
  selectActiveQuote,
  selectActiveSwapperName,
  selectBuyAmountAfterFeesCryptoPrecision,
  selectBuyAmountAfterFeesUserCurrency,
  selectFirstHop,
  selectIsAnyTradeQuoteLoaded,
  selectIsTradeQuoteRequestAborted,
  selectIsUnsafeActiveQuote,
} from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppDispatch, useAppSelector } from 'state/store'
import { breakpoints } from 'theme/theme'

import { useAccountIds } from '../../hooks/useAccountIds'
import { FakeTabHeader } from '../FakeTabHeader'
import { CollapsibleQuoteList } from './components/CollapsibleQuoteList'
import { ConfirmSummary } from './components/ConfirmSummary'
import { SellAssetInput } from './components/SellAssetInput'
import { CountdownSpinner } from './components/TradeQuotes/components/CountdownSpinner'
import { WithLazyMount } from './components/WithLazyMount'
import { useSharedHeight } from './hooks/useSharedHeight'

const votingPowerParams: { feeModel: ParameterModel } = { feeModel: 'SWAPPER' }
const formControlProps = {
  borderRadius: 0,
  background: 'transparent',
  borderWidth: 0,
}
const arrowDownIcon = <ArrowDownIcon />
const emptyPercentOptions: number[] = []
const STREAM_ACKNOWLEDGEMENT_MINIMUM_TIME_TRESHOLD = 1_000 * 60 * 5

type TradeInputProps = {
  tradeInputRef: React.MutableRefObject<HTMLDivElement | null>
  isCompact?: boolean
}

export const TradeInput = ({ isCompact, tradeInputRef }: TradeInputProps) => {
  const {
    dispatch: walletDispatch,
    state: { isConnected, isDemoWallet, wallet },
  } = useWallet()
  const height = useSharedHeight(tradeInputRef)
  const [isSmallerThanXl] = useMediaQuery(`(max-width: ${breakpoints.xl})`, { ssr: false })
  const { handleSubmit } = useFormContext()
  const dispatch = useAppDispatch()
  const mixpanel = getMixPanel()
  const history = useHistory()
  const { showErrorToast } = useErrorHandler()
  const [isConfirmationLoading, setIsConfirmationLoading] = useState(false)
  const [shouldShowWarningAcknowledgement, setShouldShowWarningAcknowledgement] = useState(false)
  const [shouldShowStreamingAcknowledgement, setShouldShowStreamingAcknowledgement] =
    useState(false)
  const [shouldShowArbitrumBridgeAcknowledgement, setShouldShowArbitrumBridgeAcknowledgement] =
    useState(false)
  const isKeplr = useMemo(() => !!wallet && isKeplrHDWallet(wallet), [wallet])
  const buyAssetSearch = useModal('buyTradeAssetSearch')
  const sellAssetSearch = useModal('sellTradeAssetSearch')
  const buyAsset = useAppSelector(selectInputBuyAsset)
  const sellAsset = useAppSelector(selectInputSellAsset)

  const percentOptions = useMemo(() => {
    if (!sellAsset?.assetId) return []
    if (!isToken(fromAssetId(sellAsset.assetId).assetReference)) return []

    return [1]
  }, [sellAsset.assetId])
  const activeQuote = useAppSelector(selectActiveQuote)
  const { priceImpactPercentage } = usePriceImpact(activeQuote)

  const tradeQuoteStep = useAppSelector(selectFirstHop)
  const buyAmountAfterFeesCryptoPrecision = useAppSelector(selectBuyAmountAfterFeesCryptoPrecision)
  const buyAmountAfterFeesUserCurrency = useAppSelector(selectBuyAmountAfterFeesUserCurrency)
  const isUnsafeQuote = useAppSelector(selectIsUnsafeActiveQuote)
  const isTradeQuoteApiQueryPending = useAppSelector(selectIsTradeQuoteApiQueryPending)
  const isAnyTradeQuoteLoaded = useAppSelector(selectIsAnyTradeQuoteLoaded)
  const isTradeQuoteRequestAborted = useAppSelector(selectIsTradeQuoteRequestAborted)
  const hasUserEnteredAmount = useAppSelector(selectHasUserEnteredAmount)

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

  const walletConnectedChainIds = useAppSelector(selectWalletConnectedChainIds)
  const defaultSellAsset = useAppSelector(selectHighestMarketCapFeeAsset)

  // If the user disconnects the chain for the currently selected sell asset, switch to the default asset
  useEffect(() => {
    if (!defaultSellAsset) return

    if (walletConnectedChainIds.includes(sellAsset.chainId)) return

    setSellAsset(defaultSellAsset)
  }, [defaultSellAsset, sellAsset, setSellAsset, walletConnectedChainIds])

  const activeSwapperName = useAppSelector(selectActiveSwapperName)
  const isSnapshotApiQueriesPending = useAppSelector(selectIsSnapshotApiQueriesPending)
  const votingPower = useAppSelector(state => selectVotingPower(state, votingPowerParams))

  const pollingInterval = useMemo(() => {
    if (!activeSwapperName) return DEFAULT_GET_TRADE_QUOTE_POLLING_INTERVAL
    return swappers[activeSwapperName]?.pollingInterval ?? DEFAULT_GET_TRADE_QUOTE_POLLING_INTERVAL
  }, [activeSwapperName])

  const isVotingPowerLoading = useMemo(
    () => isSnapshotApiQueriesPending && votingPower === undefined,
    [isSnapshotApiQueriesPending, votingPower],
  )

  const {
    sellAssetAccountId: initialSellAssetAccountId,
    buyAssetAccountId: initialBuyAssetAccountId,
    setSellAssetAccountId,
    setBuyAssetAccountId,
  } = useAccountIds()

  const useReceiveAddressArgs = useMemo(
    () => ({
      fetchUnchainedAddress: Boolean(wallet && isLedger(wallet)),
    }),
    [wallet],
  )

  const { manualReceiveAddress, walletReceiveAddress } = useReceiveAddress(useReceiveAddressArgs)

  const isRefetching = useMemo(
    () => Boolean(activeSwapperName && isTradeQuoteApiQueryPending[activeSwapperName] === true),
    [activeSwapperName, isTradeQuoteApiQueryPending],
  )

  const isLoading = useMemo(
    () =>
      (!isAnyTradeQuoteLoaded && !isTradeQuoteRequestAborted) ||
      isConfirmationLoading ||
      // Only consider snapshot API queries as pending if we don't have voting power yet
      // if we do, it means we have persisted or cached (both stale) data, which is enough to let the user continue
      // as we are optimistic and don't want to be waiting for a potentially very long time for the snapshot API to respond
      isVotingPowerLoading,
    [
      isAnyTradeQuoteLoaded,
      isTradeQuoteRequestAborted,
      isConfirmationLoading,
      isVotingPowerLoading,
    ],
  )

  const translate = useTranslate()
  const overlayTitle = useMemo(
    () => translate('trade.swappingComingSoonForWallet', { walletName: 'Keplr' }),
    [translate],
  )

  const handleSellAssetClick = useCallback(() => {
    sellAssetSearch.open({
      onAssetClick: setSellAsset,
      title: 'trade.tradeFrom',
    })
  }, [sellAssetSearch, setSellAsset])

  const handleBuyAssetClick = useCallback(() => {
    buyAssetSearch.open({
      onAssetClick: setBuyAsset,
      title: 'trade.tradeTo',
    })
  }, [buyAssetSearch, setBuyAsset])

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

  const walletSupportsBuyAssetChain = useWalletSupportsChain(buyAsset.chainId, wallet)

  const isEstimatedExecutionTimeOverTreshold = useMemo(() => {
    if (!tradeQuoteStep?.estimatedExecutionTimeMs) return false

    if (tradeQuoteStep?.estimatedExecutionTimeMs >= STREAM_ACKNOWLEDGEMENT_MINIMUM_TIME_TRESHOLD)
      return true

    return false
  }, [tradeQuoteStep?.estimatedExecutionTimeMs])

  const handleFormSubmit = useMemo(() => handleSubmit(onSubmit), [handleSubmit, onSubmit])

  // If the warning acknowledgement is shown, we need to handle the submit differently because we might want to show the streaming acknowledgement
  const handleWarningAcknowledgementSubmit = useCallback(() => {
    if (activeQuote?.isStreaming && isEstimatedExecutionTimeOverTreshold)
      return setShouldShowStreamingAcknowledgement(true)
    if (isArbitrumBridgeTradeQuote(activeQuote) && activeQuote.direction === 'withdrawal')
      return setShouldShowArbitrumBridgeAcknowledgement(true)
    handleFormSubmit()
  }, [activeQuote, isEstimatedExecutionTimeOverTreshold, handleFormSubmit])

  const handleTradeQuoteConfirm = useCallback(() => {
    if (isUnsafeQuote) return setShouldShowWarningAcknowledgement(true)
    if (activeQuote?.isStreaming && isEstimatedExecutionTimeOverTreshold)
      return setShouldShowStreamingAcknowledgement(true)
    if (isArbitrumBridgeTradeQuote(activeQuote) && activeQuote.direction === 'withdrawal')
      return setShouldShowArbitrumBridgeAcknowledgement(true)

    handleFormSubmit()
  }, [isUnsafeQuote, activeQuote, isEstimatedExecutionTimeOverTreshold, handleFormSubmit])

  const sellTradeAssetSelect = useMemo(
    () => (
      <TradeAssetSelect
        assetId={sellAsset.assetId}
        onAssetClick={handleSellAssetClick}
        onAssetChange={setSellAsset}
        onlyConnectedChains={true}
      />
    ),
    [handleSellAssetClick, sellAsset.assetId, setSellAsset],
  )

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

  // disable switching assets if the buy asset isn't supported
  const shouldDisableSwitchAssets = useMemo(() => {
    return !walletSupportsBuyAssetChain
  }, [walletSupportsBuyAssetChain])

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

  const handleClickClaims = useCallback(() => {
    // TODO: Implement claims
  }, [])

  return (
    <TradeSlideTransition>
      <MessageOverlay show={isKeplr} title={overlayTitle}>
        <Flex
          width='full'
          justifyContent='center'
          maxWidth={isCompact || isSmallerThanXl ? '500px' : undefined}
        >
          <Center width='inherit'>
            <Card flex={1} width='full' maxWidth='500px' ref={tradeInputRef}>
              <ArbitrumBridgeAcknowledgement
                onAcknowledge={handleFormSubmit}
                shouldShowAcknowledgement={shouldShowArbitrumBridgeAcknowledgement}
                setShouldShowAcknowledgement={setShouldShowArbitrumBridgeAcknowledgement}
              >
                <StreamingAcknowledgement
                  onAcknowledge={handleFormSubmit}
                  shouldShowAcknowledgement={shouldShowStreamingAcknowledgement}
                  setShouldShowAcknowledgement={setShouldShowStreamingAcknowledgement}
                  estimatedTimeMs={
                    tradeQuoteStep?.estimatedExecutionTimeMs
                      ? tradeQuoteStep.estimatedExecutionTimeMs
                      : 0
                  }
                >
                  <WarningAcknowledgement
                    message={warningAcknowledgementMessage}
                    onAcknowledge={handleWarningAcknowledgementSubmit}
                    shouldShowAcknowledgement={shouldShowWarningAcknowledgement}
                    setShouldShowAcknowledgement={setShouldShowWarningAcknowledgement}
                  >
                    <Stack spacing={0} as='form' onSubmit={handleTradeQuoteConfirm}>
                      <CardHeader px={6}>
                        <Flex alignItems='center' justifyContent='space-between'>
                          <FakeTabHeader onClickClaims={handleClickClaims} />
                          <Flex gap={2} alignItems='center'>
                            {activeQuote && (isCompact || isSmallerThanXl) && (
                              <CountdownSpinner
                                isLoading={isLoading || isRefetching}
                                initialTimeMs={pollingInterval}
                              />
                            )}
                            <SlippagePopover />
                          </Flex>
                        </Flex>
                      </CardHeader>
                      <Stack spacing={0}>
                        <SellAssetInput
                          accountId={initialSellAssetAccountId}
                          asset={sellAsset}
                          label={translate('trade.payWith')}
                          onAccountIdChange={setSellAssetAccountId}
                          labelPostFix={sellTradeAssetSelect}
                          percentOptions={percentOptions}
                        />
                        <Flex alignItems='center' justifyContent='center' my={-2}>
                          <Divider />
                          <CircularProgress
                            color='blue.500'
                            thickness='4px'
                            size='34px'
                            trackColor='transparent'
                            isIndeterminate={isLoading}
                            borderRadius='full'
                          >
                            <CircularProgressLabel
                              fontSize='md'
                              display='flex'
                              alignItems='center'
                              justifyContent='center'
                            >
                              <IconButton
                                onClick={handleSwitchAssets}
                                isRound
                                size='sm'
                                position='relative'
                                variant='outline'
                                borderColor='border.base'
                                zIndex={1}
                                aria-label={translate('lending.switchAssets')}
                                icon={arrowDownIcon}
                                isDisabled={shouldDisableSwitchAssets}
                              />
                            </CircularProgressLabel>
                          </CircularProgress>

                          <Divider />
                        </Flex>
                        <TradeAssetInput
                          // Disable account selection when user set a manual receive address
                          isAccountSelectionHidden={Boolean(manualReceiveAddress)}
                          isReadOnly={true}
                          accountId={initialBuyAssetAccountId}
                          assetId={buyAsset.assetId}
                          assetSymbol={buyAsset.symbol}
                          assetIcon={buyAsset.icon}
                          cryptoAmount={
                            hasUserEnteredAmount
                              ? positiveOrZero(buyAmountAfterFeesCryptoPrecision).toFixed()
                              : '0'
                          }
                          fiatAmount={
                            hasUserEnteredAmount
                              ? positiveOrZero(buyAmountAfterFeesUserCurrency).toFixed()
                              : '0'
                          }
                          percentOptions={emptyPercentOptions}
                          showInputSkeleton={isLoading}
                          showFiatSkeleton={isLoading}
                          label={translate('trade.youGet')}
                          onAccountIdChange={setBuyAssetAccountId}
                          formControlProps={formControlProps}
                          labelPostFix={buyTradeAssetSelect}
                          priceImpactPercentage={priceImpactPercentage?.toString()}
                        />
                      </Stack>
                      <ConfirmSummary
                        isCompact={isCompact}
                        isLoading={isLoading}
                        initialSellAssetAccountId={initialSellAssetAccountId}
                        receiveAddress={manualReceiveAddress ?? walletReceiveAddress}
                      />
                    </Stack>
                  </WarningAcknowledgement>
                </StreamingAcknowledgement>
              </ArbitrumBridgeAcknowledgement>
            </Card>

            <WithLazyMount
              shouldUse={!isCompact && !isSmallerThanXl}
              component={CollapsibleQuoteList}
              isOpen={!isCompact && !isSmallerThanXl && hasUserEnteredAmount}
              isLoading={isLoading}
              width={tradeInputRef.current?.offsetWidth ?? 'full'}
              height={height ?? 'full'}
              ml={4}
            />
          </Center>
        </Flex>
      </MessageOverlay>
    </TradeSlideTransition>
  )
}
