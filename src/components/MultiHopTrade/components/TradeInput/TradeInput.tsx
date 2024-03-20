import { ArrowDownIcon } from '@chakra-ui/icons'
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  Card,
  CardFooter,
  CardHeader,
  Center,
  CircularProgress,
  CircularProgressLabel,
  Divider,
  Flex,
  Heading,
  IconButton,
  Stack,
  useMediaQuery,
} from '@chakra-ui/react'
import { fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { SwapperName } from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { TradeAssetSelect } from 'components/AssetSelection/AssetSelection'
import { MessageOverlay } from 'components/MessageOverlay/MessageOverlay'
import { RateGasRow } from 'components/MultiHopTrade/components/RateGasRow'
import { SlippagePopover } from 'components/MultiHopTrade/components/SlippagePopover'
import { TradeAssetInput } from 'components/MultiHopTrade/components/TradeAssetInput'
import { ManualAddressEntry } from 'components/MultiHopTrade/components/TradeInput/components/ManualAddressEntry'
import { ReceiveSummary } from 'components/MultiHopTrade/components/TradeInput/components/ReceiveSummary'
import { getMixpanelEventData } from 'components/MultiHopTrade/helpers'
import { usePriceImpact } from 'components/MultiHopTrade/hooks/quoteValidation/usePriceImpact'
import { useGetTradeQuotes } from 'components/MultiHopTrade/hooks/useGetTradeQuotes/useGetTradeQuotes'
import { useReceiveAddress } from 'components/MultiHopTrade/hooks/useReceiveAddress'
import { TradeSlideTransition } from 'components/MultiHopTrade/TradeSlideTransition'
import { TradeRoutePaths } from 'components/MultiHopTrade/types'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { useIsSmartContractAddress } from 'hooks/useIsSmartContractAddress/useIsSmartContractAddress'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useWalletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { positiveOrZero } from 'lib/bignumber/bignumber'
import type { ParameterModel } from 'lib/fees/parameters/types'
import { fromBaseUnit } from 'lib/math'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'
import {
  THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE,
  THORCHAIN_LONGTAIL_SWAP_SOURCE,
} from 'lib/swapper/swappers/ThorchainSwapper/constants'
import type { ThorTradeQuote } from 'lib/swapper/swappers/ThorchainSwapper/getThorTradeQuote/getTradeQuote'
import { isKeplrHDWallet, isToken } from 'lib/utils'
import { selectIsSnapshotApiQueriesPending, selectVotingPower } from 'state/apis/snapshot/selectors'
import { selectIsTradeQuoteApiQueryPending } from 'state/apis/swapper/selectors'
import {
  selectAccountIdsByAssetId,
  selectHasUserEnteredAmount,
  selectInputBuyAsset,
  selectInputSellAsset,
  selectManualReceiveAddressIsEditing,
  selectManualReceiveAddressIsValid,
  selectManualReceiveAddressIsValidating,
} from 'state/slices/selectors'
import { tradeInput } from 'state/slices/tradeInputSlice/tradeInputSlice'
import {
  selectActiveQuote,
  selectActiveQuoteErrors,
  selectActiveSwapperName,
  selectBuyAmountAfterFeesCryptoPrecision,
  selectBuyAmountAfterFeesUserCurrency,
  selectBuyAmountBeforeFeesCryptoPrecision,
  selectFirstHop,
  selectIsAnyTradeQuoteLoaded,
  selectIsTradeQuoteRequestAborted,
  selectIsUnsafeActiveQuote,
  selectTotalNetworkFeeUserCurrencyPrecision,
  selectTotalProtocolFeeByAsset,
  selectTradeQuoteRequestErrors,
  selectTradeQuoteResponseErrors,
  selectTradeSlippagePercentageDecimal,
} from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppDispatch, useAppSelector } from 'state/store'
import { breakpoints } from 'theme/theme'

import { useAccountIds } from '../../hooks/useAccountIds'
import { useSupportedAssets } from '../../hooks/useSupportedAssets'
import { QuoteList } from '../QuoteList/QuoteList'
import { CollapsibleQuoteList } from './components/CollapsibleQuoteList'
import { RecipientAddress } from './components/RecipientAddress'
import { SellAssetInput } from './components/SellAssetInput'
import { CountdownSpinner } from './components/TradeQuotes/components/CountdownSpinner'
import { WithLazyMount } from './components/WithLazyMount'
import { getQuoteErrorTranslation } from './getQuoteErrorTranslation'
import { getQuoteRequestErrorTranslation } from './getQuoteRequestErrorTranslation'
import { useSharedHeight } from './hooks/useSharedHieght'

const votingPowerParams: { feeModel: ParameterModel } = { feeModel: 'SWAPPER' }
const formControlProps = {
  borderRadius: 0,
  background: 'transparent',
  borderWidth: 0,
}
const arrowDownIcon = <ArrowDownIcon />
const emptyPercentOptions: number[] = []

type TradeInputProps = {
  isCompact?: boolean
}

// dummy component to allow us to lazily mount this beast of a hook
const GetTradeQuotes = () => {
  useGetTradeQuotes()
  return <></>
}

export const TradeInput = memo(({ isCompact }: TradeInputProps) => {
  const {
    dispatch: walletDispatch,
    state: { isConnected, isDemoWallet, wallet },
  } = useWallet()
  const { observedRef: tradeInputRef, height: tradeInputHeight } = useSharedHeight()
  const [isSmallerThanXl] = useMediaQuery(`(max-width: ${breakpoints.xl})`, { ssr: false })
  const { handleSubmit } = useFormContext()
  const dispatch = useAppDispatch()
  const mixpanel = getMixPanel()
  const history = useHistory()
  const { showErrorToast } = useErrorHandler()
  const [isCompactQuoteListOpen, setIsCompactQuoteListOpen] = useState(false)
  const [isConfirmationLoading, setIsConfirmationLoading] = useState(false)
  const isKeplr = useMemo(() => !!wallet && isKeplrHDWallet(wallet), [wallet])
  const buyAssetSearch = useModal('buyAssetSearch')
  const sellAssetSearch = useModal('sellAssetSearch')
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
  const totalProtocolFees = useAppSelector(selectTotalProtocolFeeByAsset)
  const buyAmountAfterFeesCryptoPrecision = useAppSelector(selectBuyAmountAfterFeesCryptoPrecision)
  const buyAmountAfterFeesUserCurrency = useAppSelector(selectBuyAmountAfterFeesUserCurrency)
  const totalNetworkFeeFiatPrecision = useAppSelector(selectTotalNetworkFeeUserCurrencyPrecision)
  const manualReceiveAddressIsValidating = useAppSelector(selectManualReceiveAddressIsValidating)
  const manualReceiveAddressIsEditing = useAppSelector(selectManualReceiveAddressIsEditing)
  const manualReceiveAddressIsValid = useAppSelector(selectManualReceiveAddressIsValid)
  const slippageDecimal = useAppSelector(selectTradeSlippagePercentageDecimal)
  const activeQuoteErrors = useAppSelector(selectActiveQuoteErrors)
  const quoteRequestErrors = useAppSelector(selectTradeQuoteRequestErrors)
  const quoteResponseErrors = useAppSelector(selectTradeQuoteResponseErrors)
  const isUnsafeQuote = useAppSelector(selectIsUnsafeActiveQuote)
  const isTradeQuoteApiQueryPending = useAppSelector(selectIsTradeQuoteApiQueryPending)
  const isAnyTradeQuoteLoaded = useAppSelector(selectIsAnyTradeQuoteLoaded)
  const isTradeQuoteRequestAborted = useAppSelector(selectIsTradeQuoteRequestAborted)
  const hasUserEnteredAmount = useAppSelector(selectHasUserEnteredAmount)

  const quoteStatusTranslation = useMemo(() => {
    const quoteRequestError = quoteRequestErrors[0]
    const quoteResponseError = quoteResponseErrors[0]
    const tradeQuoteError = activeQuoteErrors?.[0]
    switch (true) {
      case !isAnyTradeQuoteLoaded:
      case !hasUserEnteredAmount:
        return 'trade.previewTrade'
      case !!quoteRequestError:
        return getQuoteRequestErrorTranslation(quoteRequestError)
      case !!quoteResponseError:
        return getQuoteRequestErrorTranslation(quoteResponseError)
      case !!tradeQuoteError:
        // this should never occur because users shouldn't be able to select an errored quote
        // but just in case
        return getQuoteErrorTranslation(tradeQuoteError!)
      case !isConnected || isDemoWallet:
        // We got a happy path quote, but we may still be in the context of the demo wallet
        return 'common.connectWallet'
      default:
        return 'trade.previewTrade'
    }
  }, [
    quoteRequestErrors,
    quoteResponseErrors,
    activeQuoteErrors,
    isAnyTradeQuoteLoaded,
    hasUserEnteredAmount,
    isConnected,
    isDemoWallet,
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
    () => dispatch(tradeInput.actions.switchAssets()),
    [dispatch],
  )

  useEffect(() => {
    // WARNING: do not remove.
    // clear the confirmed quote on mount to prevent stale data affecting the selectors
    dispatch(tradeQuoteSlice.actions.resetConfirmedQuote())
    // clear the active quote index on mount to prevent stale data affecting the selectors
    dispatch(tradeQuoteSlice.actions.resetActiveQuote())
    dispatch(tradeInput.actions.setSlippagePreferencePercentage(undefined))
  }, [dispatch])

  const {
    supportedSellAssets,
    supportedBuyAssets,
    isLoading: isSupportedAssetsLoading,
  } = useSupportedAssets()
  const activeSwapperName = useAppSelector(selectActiveSwapperName)
  const rate = activeQuote?.rate
  const isSnapshotApiQueriesPending = useAppSelector(selectIsSnapshotApiQueriesPending)
  const votingPower = useAppSelector(state => selectVotingPower(state, votingPowerParams))

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

  const userAddress = useMemo(() => {
    if (!initialSellAssetAccountId) return ''

    return fromAccountId(initialSellAssetAccountId).account
  }, [initialSellAssetAccountId])

  const useReceiveAddressArgs = useMemo(
    () => ({
      fetchUnchainedAddress: Boolean(wallet && isLedger(wallet)),
    }),
    [wallet],
  )

  const { manualReceiveAddress, walletReceiveAddress } = useReceiveAddress(useReceiveAddressArgs)
  const receiveAddress = manualReceiveAddress ?? walletReceiveAddress

  const { data: _isSmartContractSellAddress, isLoading: isSellAddressByteCodeLoading } =
    useIsSmartContractAddress(userAddress)

  const { data: _isSmartContractReceiveAddress, isLoading: isReceiveAddressByteCodeLoading } =
    useIsSmartContractAddress(receiveAddress ?? '')

  const disableSmartContractSwap = useMemo(() => {
    // Swappers other than THORChain shouldn't be affected by this limitation
    if (activeSwapperName !== SwapperName.Thorchain) return false

    // This is either a smart contract address, or the bytecode is still loading - disable confirm
    if (_isSmartContractSellAddress !== false) return true
    if (
      [THORCHAIN_LONGTAIL_SWAP_SOURCE, THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE].includes(
        tradeQuoteStep?.source!,
      ) &&
      _isSmartContractReceiveAddress !== false
    )
      return true

    // All checks passed - this is an EOA address
    return false
  }, [
    _isSmartContractReceiveAddress,
    _isSmartContractSellAddress,
    activeSwapperName,
    tradeQuoteStep?.source,
  ])

  const isRefetching = useMemo(
    () => Boolean(activeSwapperName && isTradeQuoteApiQueryPending[activeSwapperName] === true),
    [activeSwapperName, isTradeQuoteApiQueryPending],
  )

  const isLoading = useMemo(
    () =>
      (!isAnyTradeQuoteLoaded && !isTradeQuoteRequestAborted) ||
      isConfirmationLoading ||
      isSupportedAssetsLoading ||
      isSellAddressByteCodeLoading ||
      isReceiveAddressByteCodeLoading ||
      // Only consider snapshot API queries as pending if we don't have voting power yet
      // if we do, it means we have persisted or cached (both stale) data, which is enough to let the user continue
      // as we are optimistic and don't want to be waiting for a potentially very long time for the snapshot API to respond
      isVotingPowerLoading,
    [
      isAnyTradeQuoteLoaded,
      isTradeQuoteRequestAborted,
      isConfirmationLoading,
      isSupportedAssetsLoading,
      isSellAddressByteCodeLoading,
      isReceiveAddressByteCodeLoading,
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
      onClick: setSellAsset,
      title: 'trade.tradeFrom',
      assets: supportedSellAssets,
    })
  }, [sellAssetSearch, setSellAsset, supportedSellAssets])

  const handleBuyAssetClick = useCallback(() => {
    buyAssetSearch.open({
      onClick: setBuyAsset,
      title: 'trade.tradeTo',
      assets: supportedBuyAssets,
    })
  }, [buyAssetSearch, setBuyAsset, supportedBuyAssets])

  const buyAmountBeforeFeesCryptoPrecision = useAppSelector(
    selectBuyAmountBeforeFeesCryptoPrecision,
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

  const [isUnsafeQuoteNoticeDismissed, setIsUnsafeQuoteNoticeDismissed] = useState<boolean | null>(
    null,
  )

  useEffect(() => {
    if (isUnsafeQuote) setIsUnsafeQuoteNoticeDismissed(false)
  }, [isUnsafeQuote])

  const quoteHasError = useMemo(() => {
    if (!isAnyTradeQuoteLoaded) return false
    return !!activeQuoteErrors?.length || !!quoteRequestErrors?.length
  }, [activeQuoteErrors?.length, isAnyTradeQuoteLoaded, quoteRequestErrors?.length])

  const shouldDisablePreviewButton = useMemo(() => {
    return (
      // don't allow executing a quote with errors
      quoteHasError ||
      // don't execute trades while address is validating
      manualReceiveAddressIsValidating ||
      manualReceiveAddressIsEditing ||
      manualReceiveAddressIsValid === false ||
      // don't execute trades while in loading state
      isLoading ||
      // don't execute trades for smart contract addresses where they aren't supported
      disableSmartContractSwap ||
      // don't allow non-existent quotes to be executed
      !activeSwapperName ||
      !activeQuote ||
      !hasUserEnteredAmount ||
      // don't allow users to execute trades while the quote is being updated
      isTradeQuoteApiQueryPending[activeSwapperName] ||
      // don't allow users to proceed until a swapper has been selected
      !activeSwapperName
    )
  }, [
    quoteHasError,
    manualReceiveAddressIsValidating,
    manualReceiveAddressIsEditing,
    manualReceiveAddressIsValid,
    isLoading,
    disableSmartContractSwap,
    activeSwapperName,
    activeQuote,
    hasUserEnteredAmount,
    isTradeQuoteApiQueryPending,
  ])

  const maybeUnsafeTradeWarning = useMemo(() => {
    if (!isUnsafeQuote) return null

    const recommendedMinimumCryptoBaseUnit = (activeQuote as ThorTradeQuote)
      ?.recommendedMinimumCryptoBaseUnit
    if (!recommendedMinimumCryptoBaseUnit) return null
    const recommendedMinimumCryptoPrecision = fromBaseUnit(
      recommendedMinimumCryptoBaseUnit,
      sellAsset.precision,
    )

    return (
      <Flex direction='column' gap={2}>
        <Alert status='error' width='auto' fontSize='sm' variant='solid'>
          <AlertIcon color='red' />
          <Stack spacing={0}>
            <AlertDescription lineHeight='short'>
              {translate('trade.errors.unsafeQuote', {
                symbol: sellAsset.symbol,
                recommendedMin: recommendedMinimumCryptoPrecision,
              })}
            </AlertDescription>
          </Stack>
        </Alert>
      </Flex>
    )
  }, [activeQuote, isUnsafeQuote, sellAsset.precision, sellAsset.symbol, translate])

  const handleAcknowledgeUnsafeQuote = useCallback(() => {
    // We don't want to *immediately* set this or there will be a "click-through"
    // i.e the regular continue button will render immediately, and click will bubble to it
    setTimeout(() => {
      setIsUnsafeQuoteNoticeDismissed(true)
    }, 100)
  }, [])

  const handleCloseCompactQuoteList = useCallback(() => setIsCompactQuoteListOpen(false), [])

  const handleOpenCompactQuoteList = useCallback(() => {
    if (!isCompact && !isSmallerThanXl) return
    setIsCompactQuoteListOpen(true)
  }, [isCompact, isSmallerThanXl])

  useEffect(() => {
    if (isCompactQuoteListOpen && !isCompact && !isSmallerThanXl) {
      setIsCompactQuoteListOpen(false)
    }
  }, [isCompact, isCompactQuoteListOpen, isSmallerThanXl])

  const buyAssetAccountIds = useAppSelector(state =>
    selectAccountIdsByAssetId(state, { assetId: buyAsset.assetId }),
  )
  const walletSupportsBuyAssetChain = useWalletSupportsChain(buyAsset.chainId, wallet)
  const shouldShowManualReceiveAddressInput = useMemo(() => {
    // Ledger "supports" all chains, but may not have them connected
    if (wallet && isLedger(wallet)) return !buyAssetAccountIds.length && !activeQuote
    // We want to display the manual address entry if the wallet doesn't support the buy asset chain,
    // but stop displaying it as soon as we have a quote
    return !walletSupportsBuyAssetChain && !activeQuote
  }, [activeQuote, buyAssetAccountIds.length, wallet, walletSupportsBuyAssetChain])

  const ConfirmSummary: JSX.Element = useMemo(
    () => (
      <>
        <CardFooter
          borderTopWidth={1}
          borderColor='border.subtle'
          flexDir='column'
          gap={4}
          px={0}
          py={0}
        >
          {hasUserEnteredAmount && (
            <RateGasRow
              sellSymbol={sellAsset.symbol}
              buySymbol={buyAsset.symbol}
              gasFee={totalNetworkFeeFiatPrecision ?? 'unknown'}
              rate={rate}
              isLoading={isLoading}
              swapperName={activeSwapperName}
              swapSource={tradeQuoteStep?.source}
              onRateClick={handleOpenCompactQuoteList}
              allowSelectQuote={Boolean(isSmallerThanXl || isCompact)}
            >
              <ReceiveSummary
                isLoading={isLoading}
                symbol={buyAsset.symbol}
                amountCryptoPrecision={buyAmountAfterFeesCryptoPrecision ?? '0'}
                amountBeforeFeesCryptoPrecision={buyAmountBeforeFeesCryptoPrecision}
                protocolFees={totalProtocolFees}
                slippageDecimalPercentage={slippageDecimal}
                swapperName={activeSwapperName ?? ''}
                defaultIsOpen={true}
                swapSource={tradeQuoteStep?.source}
                priceImpact={priceImpactPercentage}
              />
            </RateGasRow>
          )}
        </CardFooter>
        <CardFooter
          borderTopWidth={1}
          borderColor='border.subtle'
          flexDir='column'
          gap={4}
          px={6}
          bg='background.surface.raised.accent'
          borderBottomRadius='xl'
        >
          <WithLazyMount shouldUse={Boolean(receiveAddress)} component={RecipientAddress} />
          <WithLazyMount
            shouldUse={shouldShowManualReceiveAddressInput}
            component={ManualAddressEntry}
          />
          {maybeUnsafeTradeWarning}
          {isUnsafeQuote && !isUnsafeQuoteNoticeDismissed ? (
            <Button
              colorScheme='red'
              size='lg-multiline'
              mx={-2}
              onClick={handleAcknowledgeUnsafeQuote}
            >
              <Text translation={'defi.modals.saversVaults.understand'} />
            </Button>
          ) : (
            <Button
              type='submit'
              colorScheme={quoteHasError ? 'red' : 'blue'}
              size='lg-multiline'
              data-test='trade-form-preview-button'
              isDisabled={shouldDisablePreviewButton}
              mx={-2}
            >
              <Text translation={quoteStatusTranslation} />
            </Button>
          )}
        </CardFooter>
      </>
    ),
    [
      hasUserEnteredAmount,
      sellAsset.symbol,
      buyAsset.symbol,
      totalNetworkFeeFiatPrecision,
      rate,
      isLoading,
      activeSwapperName,
      tradeQuoteStep?.source,
      handleOpenCompactQuoteList,
      isSmallerThanXl,
      isCompact,
      buyAmountAfterFeesCryptoPrecision,
      buyAmountBeforeFeesCryptoPrecision,
      totalProtocolFees,
      slippageDecimal,
      priceImpactPercentage,
      receiveAddress,
      shouldShowManualReceiveAddressInput,
      maybeUnsafeTradeWarning,
      isUnsafeQuote,
      isUnsafeQuoteNoticeDismissed,
      handleAcknowledgeUnsafeQuote,
      quoteHasError,
      shouldDisablePreviewButton,
      quoteStatusTranslation,
    ],
  )

  const handleFormSubmit = useMemo(() => handleSubmit(onSubmit), [handleSubmit, onSubmit])

  const sellTradeAssetSelect = useMemo(
    () => (
      <TradeAssetSelect
        assetId={sellAsset.assetId}
        onAssetClick={handleSellAssetClick}
        onAssetChange={setSellAsset}
        isLoading={isSupportedAssetsLoading}
      />
    ),
    [handleSellAssetClick, isSupportedAssetsLoading, sellAsset.assetId, setSellAsset],
  )

  const buyTradeAssetSelect = useMemo(
    () => (
      <TradeAssetSelect
        assetId={buyAsset.assetId}
        onAssetClick={handleBuyAssetClick}
        onAssetChange={setBuyAsset}
        isLoading={isSupportedAssetsLoading}
      />
    ),
    [buyAsset.assetId, handleBuyAssetClick, isSupportedAssetsLoading, setBuyAsset],
  )

  // disable switching assets if the buy asset isn't supported
  const shouldDisableSwitchAssets = useMemo(() => {
    return !walletSupportsBuyAssetChain
  }, [walletSupportsBuyAssetChain])

  return (
    <TradeSlideTransition>
      <WithLazyMount shouldUse={hasUserEnteredAmount} component={GetTradeQuotes} />
      <MessageOverlay show={isKeplr} title={overlayTitle}>
        <Flex
          width='full'
          justifyContent='center'
          maxWidth={isCompact || isSmallerThanXl ? '500px' : undefined}
        >
          {(isCompact || isSmallerThanXl) && (
            <Center width='inherit' display={!isCompactQuoteListOpen ? 'none' : undefined}>
              <QuoteList
                onBack={handleCloseCompactQuoteList}
                isLoading={isLoading}
                height={tradeInputHeight ?? '500px'}
                width={tradeInputRef.current?.offsetWidth ?? 'full'}
              />
            </Center>
          )}
          <Center width='inherit'>
            <Card
              flex={1}
              width='full'
              maxWidth='500px'
              ref={tradeInputRef}
              visibility={isCompactQuoteListOpen ? 'hidden' : undefined}
              position={isCompactQuoteListOpen ? 'absolute' : undefined}
            >
              <Stack spacing={0} as='form' onSubmit={handleFormSubmit}>
                <CardHeader px={6}>
                  <Flex alignItems='center' justifyContent='space-between'>
                    <Heading as='h5' fontSize='md'>
                      {translate('navBar.trade')}
                    </Heading>
                    <Flex gap={2} alignItems='center'>
                      {activeQuote && (isCompact || isSmallerThanXl) && (
                        <CountdownSpinner isLoading={isLoading || isRefetching} />
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
                {ConfirmSummary}
              </Stack>
            </Card>

            <WithLazyMount
              shouldUse={!isCompact && !isSmallerThanXl}
              component={CollapsibleQuoteList}
              isOpen={!isCompact && !isSmallerThanXl && hasUserEnteredAmount}
              isLoading={isLoading}
              width={tradeInputRef.current?.offsetWidth ?? 'full'}
              height={tradeInputHeight ?? 'full'}
              ml={4}
            />
          </Center>
        </Flex>
      </MessageOverlay>
    </TradeSlideTransition>
  )
})
