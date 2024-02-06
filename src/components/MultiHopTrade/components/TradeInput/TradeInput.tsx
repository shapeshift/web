import { ArrowDownIcon } from '@chakra-ui/icons'
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  CardFooter,
  CardHeader,
  Divider,
  Flex,
  Heading,
  IconButton,
  Stack,
} from '@chakra-ui/react'
import { fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { SwapperName } from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { MessageOverlay } from 'components/MessageOverlay/MessageOverlay'
import { TradeAssetSelect } from 'components/MultiHopTrade/components/AssetSelection'
import { RateGasRow } from 'components/MultiHopTrade/components/RateGasRow'
import { SlippagePopover } from 'components/MultiHopTrade/components/SlippagePopover'
import { TradeAssetInput } from 'components/MultiHopTrade/components/TradeAssetInput'
import { ReceiveSummary } from 'components/MultiHopTrade/components/TradeConfirm/ReceiveSummary'
import { ManualAddressEntry } from 'components/MultiHopTrade/components/TradeInput/components/ManualAddressEntry'
import { getMixpanelEventData } from 'components/MultiHopTrade/helpers'
import { usePriceImpact } from 'components/MultiHopTrade/hooks/quoteValidation/usePriceImpact'
import { checkApprovalNeeded } from 'components/MultiHopTrade/hooks/useAllowanceApproval/helpers'
import { useGetTradeQuotes } from 'components/MultiHopTrade/hooks/useGetTradeQuotes/useGetTradeQuotes'
import { useReceiveAddress } from 'components/MultiHopTrade/hooks/useReceiveAddress'
import { TradeRoutePaths } from 'components/MultiHopTrade/types'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useIsSmartContractAddress } from 'hooks/useIsSmartContractAddress/useIsSmartContractAddress'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero, positiveOrZero } from 'lib/bignumber/bignumber'
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
  selectInputBuyAsset,
  selectInputSellAmountCryptoPrecision,
  selectInputSellAsset,
  selectManualReceiveAddressIsEditing,
  selectManualReceiveAddressIsValid,
  selectManualReceiveAddressIsValidating,
  selectWalletSupportedChainIds,
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
  selectIsUnsafeActiveQuote,
  selectSwapperSupportsCrossAccountTrade,
  selectTotalNetworkFeeUserCurrencyPrecision,
  selectTotalProtocolFeeByAsset,
  selectTradeQuoteRequestErrors,
  selectTradeQuoteResponseErrors,
  selectTradeSlippagePercentageDecimal,
} from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

import { useAccountIds } from '../../hooks/useAccountIds'
import { useSupportedAssets } from '../../hooks/useSupportedAssets'
import { PriceImpact } from '../PriceImpact'
import { RecipientAddress } from './components/RecipientAddress'
import { SellAssetInput } from './components/SellAssetInput'
import { TradeQuotes } from './components/TradeQuotes/TradeQuotes'
import { getQuoteErrorTranslation } from './getQuoteErrorTranslation'
import { getQuoteRequestErrorTranslation } from './getQuoteRequestErrorTranslation'

const formControlProps = {
  borderRadius: 0,
  background: 'transparent',
  borderWidth: 0,
  paddingBottom: 0,
}

const arrowDownIcon = <ArrowDownIcon />
const emptyPercentOptions: number[] = []

export const TradeInput = memo(() => {
  const {
    isAnySwapperFetched: _isAnySwapperFetched,
    isQuoteRequestComplete: _isQuoteRequestComplete,
    isQuoteRequestUninitialized,
    didQuoteRequestFail,
    isQuoteRequestIncomplete,
  } = useGetTradeQuotes()
  const {
    state: { wallet },
  } = useWallet()
  const { handleSubmit } = useFormContext()
  const dispatch = useAppDispatch()
  const mixpanel = getMixPanel()
  const history = useHistory()
  const { showErrorToast } = useErrorHandler()
  const [isConfirmationLoading, setIsConfirmationLoading] = useState(false)
  const [isAnySwapperFetched, setIsAnySwapperFetched] = useState(true)
  const [isQuoteRequestComplete, setIsQuoteRequestComplete] = useState(true)
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
  const { isModeratePriceImpact, priceImpactPercentage } = usePriceImpact(activeQuote)
  const enableMultiHopTrades = useFeatureFlag('MultiHopTrades')

  const tradeQuoteStep = useAppSelector(selectFirstHop)
  const swapperSupportsCrossAccountTrade = useAppSelector(selectSwapperSupportsCrossAccountTrade)
  const totalProtocolFees = useAppSelector(selectTotalProtocolFeeByAsset)
  const buyAmountAfterFeesCryptoPrecision = useAppSelector(selectBuyAmountAfterFeesCryptoPrecision)
  const buyAmountAfterFeesUserCurrency = useAppSelector(selectBuyAmountAfterFeesUserCurrency)
  const totalNetworkFeeFiatPrecision = useAppSelector(selectTotalNetworkFeeUserCurrencyPrecision)
  const manualReceiveAddressIsValidating = useAppSelector(selectManualReceiveAddressIsValidating)
  const manualReceiveAddressIsEditing = useAppSelector(selectManualReceiveAddressIsEditing)
  const manualReceiveAddressIsValid = useAppSelector(selectManualReceiveAddressIsValid)
  const sellAmountCryptoPrecision = useAppSelector(selectInputSellAmountCryptoPrecision)
  const slippageDecimal = useAppSelector(selectTradeSlippagePercentageDecimal)
  const activeQuoteErrors = useAppSelector(selectActiveQuoteErrors)
  const quoteRequestErrors = useAppSelector(selectTradeQuoteRequestErrors)
  const quoteResponseErrors = useAppSelector(selectTradeQuoteResponseErrors)
  const isUnsafeQuote = useAppSelector(selectIsUnsafeActiveQuote)
  const isTradeQuoteApiQueryPending = useAppSelector(selectIsTradeQuoteApiQueryPending)
  const walletSupportedChainIds = useAppSelector(selectWalletSupportedChainIds)

  // whenever the sell amount changes, set the quote states to fetching
  useEffect(() => {
    setIsAnySwapperFetched(false)
    setIsQuoteRequestComplete(false)
  }, [sellAmountCryptoPrecision])

  // when a quote becomes available, set the quote states to fetched
  useEffect(() => {
    if (_isAnySwapperFetched) {
      setIsAnySwapperFetched(true)
    }
  }, [_isAnySwapperFetched])

  // when a quote request is complete, mark it as complete
  useEffect(() => {
    if (_isQuoteRequestComplete) {
      setIsQuoteRequestComplete(true)
    }
  }, [_isQuoteRequestComplete])

  const hasUserEnteredAmount = useMemo(
    () => bnOrZero(sellAmountCryptoPrecision).gt(0),
    [sellAmountCryptoPrecision],
  )

  const quoteStatusTranslation = useMemo(() => {
    const quoteRequestError = quoteRequestErrors[0]
    const quoteResponseError = quoteResponseErrors[0]
    const tradeQuoteError = activeQuoteErrors?.[0]
    switch (true) {
      case !isAnySwapperFetched:
        return 'common.loadingText'
      case !hasUserEnteredAmount || isQuoteRequestUninitialized:
        return 'trade.previewTrade'
      case !!quoteRequestError:
        return getQuoteRequestErrorTranslation(quoteRequestError)
      case isQuoteRequestComplete && !!quoteResponseError:
        return getQuoteRequestErrorTranslation(quoteResponseError)
      case !!tradeQuoteError:
        // this should never occur because users shouldn't be able to select an errored quote
        // but just in case
        return getQuoteErrorTranslation(tradeQuoteError!)
      default:
        return 'trade.previewTrade'
    }
  }, [
    quoteRequestErrors,
    quoteResponseErrors,
    activeQuoteErrors,
    isAnySwapperFetched,
    hasUserEnteredAmount,
    isQuoteRequestUninitialized,
    isQuoteRequestComplete,
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
  const rate = activeQuote?.steps[0].rate
  const isSnapshotApiQueriesPending = useAppSelector(selectIsSnapshotApiQueriesPending)
  const votingPower = useAppSelector(selectVotingPower)

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

  const isLoading = useMemo(
    () =>
      !isAnySwapperFetched ||
      isConfirmationLoading ||
      isSupportedAssetsLoading ||
      isSellAddressByteCodeLoading ||
      isReceiveAddressByteCodeLoading ||
      // Only consider snapshot API queries as pending if we don't have voting power yet
      // if we do, it means we have persisted or cached (both stale) data, which is enough to let the user continue
      // as we are optimistic and don't want to be waiting for a potentially very long time for the snapshot API to respond
      isVotingPowerLoading,
    [
      isAnySwapperFetched,
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

  const onSubmit = useCallback(async () => {
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
        return
      }

      if (!enableMultiHopTrades) {
        const isApprovalNeeded = await checkApprovalNeeded(
          tradeQuoteStep,
          wallet,
          initialSellAssetAccountId ?? '',
        )

        if (isApprovalNeeded) {
          history.push({ pathname: TradeRoutePaths.Approval })
          return
        }
      }

      history.push({ pathname: TradeRoutePaths.Confirm })
    } catch (e) {
      showErrorToast(e)
    }

    setIsConfirmationLoading(false)
  }, [
    activeQuote,
    dispatch,
    enableMultiHopTrades,
    history,
    mixpanel,
    initialSellAssetAccountId,
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
    if (isQuoteRequestUninitialized || !isAnySwapperFetched) return false
    return !!activeQuoteErrors?.length || !!quoteRequestErrors?.length
  }, [
    isQuoteRequestUninitialized,
    isAnySwapperFetched,
    activeQuoteErrors?.length,
    quoteRequestErrors?.length,
  ])

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
      // don't allow users to proceed until all swappers have an initial result
      (!activeSwapperName && isQuoteRequestIncomplete)
    )
  }, [
    quoteHasError,
    manualReceiveAddressIsValidating,
    manualReceiveAddressIsEditing,
    manualReceiveAddressIsValid,
    isLoading,
    hasUserEnteredAmount,
    activeQuote,
    disableSmartContractSwap,
    activeSwapperName,
    isTradeQuoteApiQueryPending,
    isQuoteRequestIncomplete,
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

  const ConfirmSummary: JSX.Element = useMemo(
    () => (
      <CardFooter
        borderTopWidth={1}
        borderColor='border.subtle'
        flexDir='column'
        gap={4}
        px={6}
        bg='background.surface.raised.accent'
        borderBottomRadius='xl'
      >
        {hasUserEnteredAmount && (
          <>
            {activeQuote ? (
              <RateGasRow
                sellSymbol={sellAsset.symbol}
                buySymbol={buyAsset.symbol}
                gasFee={totalNetworkFeeFiatPrecision ?? 'unknown'}
                rate={rate}
                isLoading={isLoading}
                isError={didQuoteRequestFail}
              />
            ) : null}

            {activeQuote ? (
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
              />
            ) : null}
            <RecipientAddress />
            {isModeratePriceImpact && priceImpactPercentage && (
              <PriceImpact impactPercentage={priceImpactPercentage.toFixed(2)} />
            )}
          </>
        )}

        <ManualAddressEntry />
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
            isLoading={isLoading}
            mx={-2}
          >
            <Text translation={quoteStatusTranslation} />
          </Button>
        )}
      </CardFooter>
    ),
    [
      hasUserEnteredAmount,
      sellAsset.symbol,
      buyAsset.symbol,
      totalNetworkFeeFiatPrecision,
      rate,
      isLoading,
      didQuoteRequestFail,
      activeQuote,
      buyAmountAfterFeesCryptoPrecision,
      buyAmountBeforeFeesCryptoPrecision,
      totalProtocolFees,
      slippageDecimal,
      activeSwapperName,
      tradeQuoteStep?.source,
      isModeratePriceImpact,
      priceImpactPercentage,
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
    const walletSupportsBuyAssetChain = walletSupportedChainIds.includes(buyAsset.chainId)
    return !walletSupportsBuyAssetChain
  }, [buyAsset.chainId, walletSupportedChainIds])

  return (
    <MessageOverlay show={isKeplr} title={overlayTitle}>
      <SlideTransition>
        <Stack spacing={0} as='form' onSubmit={handleFormSubmit}>
          <CardHeader px={6}>
            <Flex alignItems='center' justifyContent='space-between'>
              <Heading as='h5' fontSize='md'>
                {translate('navBar.trade')}
              </Heading>
              <SlippagePopover />
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
              <Divider />
            </Flex>
            <TradeAssetInput
              isReadOnly={true}
              accountId={initialBuyAssetAccountId}
              assetId={buyAsset.assetId}
              assetSymbol={buyAsset.symbol}
              assetIcon={buyAsset.icon}
              hideAmounts={true}
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
              isAccountSelectionDisabled={!swapperSupportsCrossAccountTrade}
              formControlProps={formControlProps}
              labelPostFix={buyTradeAssetSelect}
            >
              <TradeQuotes isLoading={isLoading} />
            </TradeAssetInput>
          </Stack>
          {ConfirmSummary}
        </Stack>
      </SlideTransition>
    </MessageOverlay>
  )
})
