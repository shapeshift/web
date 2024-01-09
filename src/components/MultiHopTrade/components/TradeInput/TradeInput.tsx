import { ArrowDownIcon } from '@chakra-ui/icons'
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  CardFooter,
  CardHeader,
  Collapse,
  Divider,
  Flex,
  Heading,
  IconButton,
  Stack,
  useToken,
} from '@chakra-ui/react'
import { fromAccountId } from '@shapeshiftoss/caip'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { SwapperName } from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'
import { AnimatePresence } from 'framer-motion'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import type { ColorFormat } from 'react-countdown-circle-timer'
import { CountdownCircleTimer } from 'react-countdown-circle-timer'
import { useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { FadeTransition } from 'components/FadeTransition'
import { MessageOverlay } from 'components/MessageOverlay/MessageOverlay'
import { TradeAssetSelect } from 'components/MultiHopTrade/components/AssetSelection'
import { RateGasRow } from 'components/MultiHopTrade/components/RateGasRow'
import { SlippagePopover } from 'components/MultiHopTrade/components/SlippagePopover'
import { TradeAssetInput } from 'components/MultiHopTrade/components/TradeAssetInput'
import { ReceiveSummary } from 'components/MultiHopTrade/components/TradeConfirm/ReceiveSummary'
import { ManualAddressEntry } from 'components/MultiHopTrade/components/TradeInput/components/ManualAddressEntry'
import { getMixpanelEventData } from 'components/MultiHopTrade/helpers'
import { useActiveQuoteStatus } from 'components/MultiHopTrade/hooks/quoteValidation/useActiveQuoteStatus'
import { usePriceImpact } from 'components/MultiHopTrade/hooks/quoteValidation/usePriceImpact'
import { checkApprovalNeeded } from 'components/MultiHopTrade/hooks/useAllowanceApproval/helpers'
import { useGetTradeQuotes } from 'components/MultiHopTrade/hooks/useGetTradeQuotes/useGetTradeQuotes'
import { TradeRoutePaths } from 'components/MultiHopTrade/types'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useIsSmartContractAddress } from 'hooks/useIsSmartContractAddress/useIsSmartContractAddress'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero, positiveOrZero } from 'lib/bignumber/bignumber'
import { calculateShapeShiftAndAffiliateFee } from 'lib/fees/utils'
import { fromBaseUnit } from 'lib/math'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'
import type { ThorTradeQuote } from 'lib/swapper/swappers/ThorchainSwapper/getThorTradeQuote/getTradeQuote'
import { isKeplrHDWallet } from 'lib/utils'
import { selectIsSnapshotApiQueriesPending, selectVotingPower } from 'state/apis/snapshot/selectors'
import {
  selectSwappersApiTradeQuotePending,
  selectSwappersApiTradeQuotes,
} from 'state/apis/swappers/selectors'
import {
  selectBuyAsset,
  selectManualReceiveAddressIsValidating,
  selectSellAmountCryptoPrecision,
  selectSellAsset,
} from 'state/slices/selectors'
import { swappers } from 'state/slices/swappersSlice/swappersSlice'
import {
  selectActiveQuote,
  selectActiveQuoteAffiliateBps,
  selectActiveQuoteError,
  selectActiveQuotePotentialAffiliateBps,
  selectActiveSwapperName,
  selectBuyAmountAfterFeesCryptoPrecision,
  selectBuyAmountAfterFeesUserCurrency,
  selectBuyAmountBeforeFeesCryptoPrecision,
  selectFirstHop,
  selectIsUnsafeActiveQuote,
  selectPotentialAffiliateFeeAmountUserCurrency,
  selectQuoteAffiliateFeeUserCurrency,
  selectSwapperSupportsCrossAccountTrade,
  selectTotalNetworkFeeUserCurrencyPrecision,
  selectTotalProtocolFeeByAsset,
  selectTradeSlippagePercentageDecimal,
} from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

import { useAccountIds } from '../../hooks/useAccountIds'
import { useSupportedAssets } from '../../hooks/useSupportedAssets'
import { PriceImpact } from '../PriceImpact'
import { SellAssetInput } from './components/SellAssetInput'
import { TradeQuotes } from './components/TradeQuotes/TradeQuotes'

const formControlProps = {
  borderRadius: 0,
  background: 'transparent',
  borderWidth: 0,
  paddingBottom: 0,
}

const arrowDownIcon = <ArrowDownIcon />

const percentOptions = [1]

export const TradeInput = memo(() => {
  useGetTradeQuotes()
  const {
    state: { wallet },
  } = useWallet()
  const { handleSubmit } = useFormContext()
  const dispatch = useAppDispatch()
  const mixpanel = getMixPanel()
  const history = useHistory()
  const { showErrorToast } = useErrorHandler()
  const [themeIndicatorColor, themeTrackColor] = useToken('colors', [
    'blue.500',
    'background.surface.raised.base',
  ])
  const [isConfirmationLoading, setIsConfirmationLoading] = useState(false)
  const isKeplr = useMemo(() => !!wallet && isKeplrHDWallet(wallet), [wallet])
  const buyAssetSearch = useModal('buyAssetSearch')
  const sellAssetSearch = useModal('sellAssetSearch')
  const buyAsset = useAppSelector(selectBuyAsset)
  const sellAsset = useAppSelector(selectSellAsset)
  const { isModeratePriceImpact, priceImpactPercentage } = usePriceImpact()
  const enableMultiHopTrades = useFeatureFlag('MultiHopTrades')

  const tradeQuoteStep = useAppSelector(selectFirstHop)
  const swapperSupportsCrossAccountTrade = useAppSelector(selectSwapperSupportsCrossAccountTrade)
  const totalProtocolFees = useAppSelector(selectTotalProtocolFeeByAsset)
  const buyAmountAfterFeesCryptoPrecision = useAppSelector(selectBuyAmountAfterFeesCryptoPrecision)
  const buyAmountAfterFeesUserCurrency = useAppSelector(selectBuyAmountAfterFeesUserCurrency)
  const totalNetworkFeeFiatPrecision = useAppSelector(selectTotalNetworkFeeUserCurrencyPrecision)
  const manualReceiveAddressIsValidating = useAppSelector(selectManualReceiveAddressIsValidating)
  const sellAmountCryptoPrecision = useAppSelector(selectSellAmountCryptoPrecision)
  const slippageDecimal = useAppSelector(selectTradeSlippagePercentageDecimal)

  const hasUserEnteredAmount = useMemo(
    () => bnOrZero(sellAmountCryptoPrecision).gt(0),
    [sellAmountCryptoPrecision],
  )
  const activeQuoteStatus = useActiveQuoteStatus()
  const setBuyAsset = useCallback(
    (asset: Asset) => dispatch(swappers.actions.setBuyAsset(asset)),
    [dispatch],
  )
  const setSellAsset = useCallback(
    (asset: Asset) => dispatch(swappers.actions.setSellAsset(asset)),
    [dispatch],
  )
  const handleSwitchAssets = useCallback(
    () => dispatch(swappers.actions.switchAssets()),
    [dispatch],
  )

  useEffect(() => {
    // WARNING: do not remove.
    // clear the confirmed quote on mount to prevent stale data affecting the selectors
    dispatch(tradeQuoteSlice.actions.resetConfirmedQuote())
    // clear the active quote index on mount to prevent stale data affecting the selectors
    dispatch(tradeQuoteSlice.actions.resetActiveQuoteIndex())
    dispatch(swappers.actions.setSlippagePreferencePercentage(undefined))
  }, [dispatch])

  const {
    supportedSellAssets,
    supportedBuyAssets,
    isLoading: isSupportedAssetsLoading,
  } = useSupportedAssets()
  const activeQuote = useAppSelector(selectActiveQuote)
  const activeQuoteError = useAppSelector(selectActiveQuoteError)
  const activeSwapperName = useAppSelector(selectActiveSwapperName)
  const sortedQuotes = useAppSelector(selectSwappersApiTradeQuotes)
  const rate = activeQuote?.steps[0].rate

  const isQuoteLoading = useAppSelector(selectSwappersApiTradeQuotePending)
  const isSnapshotApiQueriesPending = useAppSelector(selectIsSnapshotApiQueriesPending)
  const votingPower = useAppSelector(selectVotingPower)

  const isVotingPowerLoading = useMemo(
    () => isSnapshotApiQueriesPending && votingPower === undefined,
    [isSnapshotApiQueriesPending, votingPower],
  )

  const { sellAssetAccountId, buyAssetAccountId, setSellAssetAccountId, setBuyAssetAccountId } =
    useAccountIds()

  const userAddress = useMemo(() => {
    if (!sellAssetAccountId) return ''

    return fromAccountId(sellAssetAccountId).account
  }, [sellAssetAccountId])

  const { data: _isSmartContractAddress, isLoading: isAddressByteCodeLoading } =
    useIsSmartContractAddress(userAddress)

  const disableSmartContractSwap = useMemo(() => {
    // Swappers other than THORChain shouldn't be affected by this limitation
    if (activeSwapperName !== SwapperName.Thorchain) return false

    // This is either a smart contract address, or the bytecode is still loading - disable confirm
    if (_isSmartContractAddress !== false) return true

    // All checks passed - this is an EOA address
    return false
  }, [_isSmartContractAddress, activeSwapperName])

  const isLoading = useMemo(
    () =>
      isQuoteLoading ||
      isConfirmationLoading ||
      isSupportedAssetsLoading ||
      isAddressByteCodeLoading ||
      // Only consider snapshot API queries as pending if we don't have voting power yet
      // if we do, it means we have persisted or cached (both stale) data, which is enough to let the user continue
      // as we are optimistic and don't want to be waiting for a potentially very long time for the snapshot API to respond
      isVotingPowerLoading,
    [
      isAddressByteCodeLoading,
      isConfirmationLoading,
      isQuoteLoading,
      isSupportedAssetsLoading,
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

  const quoteHasError = useMemo(() => {
    return activeQuoteStatus.quoteErrors.length > 0
  }, [activeQuoteStatus.quoteErrors])

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
          sellAssetAccountId ?? '',
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
    sellAssetAccountId,
    showErrorToast,
    tradeQuoteStep,
    wallet,
  ])

  const isSellAmountEntered = bnOrZero(sellAmountCryptoPrecision).gt(0)

  const MaybeRenderedTradeQuotes: JSX.Element | null = useMemo(
    () =>
      hasUserEnteredAmount ? (
        <TradeQuotes sortedQuotes={sortedQuotes} isLoading={isLoading} />
      ) : null,
    [hasUserEnteredAmount, isLoading, sortedQuotes],
  )

  const affiliateFeeAmountUserCurrency = useAppSelector(selectQuoteAffiliateFeeUserCurrency)
  const potentialAffiliateFeeAmountUserCurrency = useAppSelector(
    selectPotentialAffiliateFeeAmountUserCurrency,
  )
  const potentialAffiliateBps = useAppSelector(selectActiveQuotePotentialAffiliateBps)
  const affiliateBps = useAppSelector(selectActiveQuoteAffiliateBps)

  const { shapeShiftFee } = useMemo(
    () =>
      calculateShapeShiftAndAffiliateFee({
        quote: activeQuote,
        potentialAffiliateFeeAmountUserCurrency,
        affiliateFeeAmountUserCurrency,
        affiliateBps,
        potentialAffiliateBps,
        swapperName: activeSwapperName,
      }),
    [
      affiliateFeeAmountUserCurrency,
      activeQuote,
      activeSwapperName,
      affiliateBps,
      potentialAffiliateBps,
      potentialAffiliateFeeAmountUserCurrency,
    ],
  )

  const [isUnsafeQuoteNoticeDismissed, setIsUnsafeQuoteNoticeDismissed] = useState<boolean | null>(
    null,
  )

  const isUnsafeQuote = useAppSelector(selectIsUnsafeActiveQuote)

  useEffect(() => {
    if (isUnsafeQuote) setIsUnsafeQuoteNoticeDismissed(false)
  }, [isUnsafeQuote])

  const quoteHasErrorExcludeUnsafe = useMemo(() => {
    // If the only error is an UnsafeQuote error and the user has dismissed the notice, don't consider it an error
    // that should disable the preview button - the user understands the risks and wishes to proceed
    if (isUnsafeQuote && activeQuoteStatus.quoteErrors.length === 1 && isUnsafeQuoteNoticeDismissed)
      return false

    return quoteHasError
  }, [
    activeQuoteStatus.quoteErrors.length,
    isUnsafeQuote,
    isUnsafeQuoteNoticeDismissed,
    quoteHasError,
  ])

  const shouldDisablePreviewButton = useMemo(() => {
    return (
      quoteHasErrorExcludeUnsafe ||
      manualReceiveAddressIsValidating ||
      isLoading ||
      !isSellAmountEntered ||
      !activeQuote ||
      disableSmartContractSwap
    )
  }, [
    activeQuote,
    disableSmartContractSwap,
    isLoading,
    isSellAmountEntered,
    manualReceiveAddressIsValidating,
    quoteHasErrorExcludeUnsafe,
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
            <RateGasRow
              sellSymbol={sellAsset.symbol}
              buySymbol={buyAsset.symbol}
              gasFee={totalNetworkFeeFiatPrecision ?? 'unknown'}
              rate={rate}
              isLoading={isLoading}
              isError={activeQuoteError !== undefined}
            />

            {activeQuote ? (
              <ReceiveSummary
                isLoading={isLoading}
                symbol={buyAsset.symbol}
                amountCryptoPrecision={buyAmountAfterFeesCryptoPrecision ?? '0'}
                amountBeforeFeesCryptoPrecision={buyAmountBeforeFeesCryptoPrecision}
                protocolFees={totalProtocolFees}
                shapeShiftFee={shapeShiftFee}
                slippageDecimalPercentage={slippageDecimal}
                swapperName={activeSwapperName ?? ''}
                defaultIsOpen={true}
                swapSource={tradeQuoteStep?.source}
              />
            ) : null}
            {isModeratePriceImpact && (
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
            // eslint-disable-next-line react-memo/require-usememo
            onClick={() => {
              // We don't want to *immediately* set this or there will be a "click-through"
              // i.e the regular continue button will render immediately, and click will bubble to it
              setTimeout(() => {
                setIsUnsafeQuoteNoticeDismissed(true)
              }, 100)
            }}
          >
            <Text translation={'defi.modals.saversVaults.understand'} />
          </Button>
        ) : (
          <Button
            type='submit'
            colorScheme={quoteHasErrorExcludeUnsafe ? 'red' : 'blue'}
            size='lg-multiline'
            data-test='trade-form-preview-button'
            isDisabled={shouldDisablePreviewButton}
            isLoading={isLoading}
            mx={-2}
          >
            <Text translation={activeQuoteStatus.quoteStatusTranslation} />
          </Button>
        )}
      </CardFooter>
    ),
    [
      activeQuote,
      activeQuoteError,
      activeQuoteStatus.quoteStatusTranslation,
      activeSwapperName,
      buyAmountAfterFeesCryptoPrecision,
      buyAmountBeforeFeesCryptoPrecision,
      buyAsset.symbol,
      hasUserEnteredAmount,
      isLoading,
      isModeratePriceImpact,
      isUnsafeQuote,
      isUnsafeQuoteNoticeDismissed,
      maybeUnsafeTradeWarning,
      priceImpactPercentage,
      quoteHasErrorExcludeUnsafe,
      rate,
      sellAsset.symbol,
      shapeShiftFee,
      shouldDisablePreviewButton,
      slippageDecimal,
      totalNetworkFeeFiatPrecision,
      totalProtocolFees,
      tradeQuoteStep?.source,
    ],
  )

  const handleFormSubmit = useMemo(() => handleSubmit(onSubmit), [handleSubmit, onSubmit])

  const countdownCircleTimerIcon = useMemo(
    () => (
      <CountdownCircleTimer
        isPlaying
        duration={20}
        size={20}
        strokeWidth={3}
        trailColor={themeTrackColor as ColorFormat}
        colors={themeIndicatorColor as ColorFormat}
      />
    ),
    [themeIndicatorColor, themeTrackColor],
  )

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

  return (
    <MessageOverlay show={isKeplr} title={overlayTitle}>
      <SlideTransition>
        <Stack spacing={0} as='form' onSubmit={handleFormSubmit}>
          <CardHeader px={6}>
            <Flex alignItems='center' justifyContent='space-between'>
              <Heading as='h5' fontSize='md'>
                {translate('navBar.trade')}
              </Heading>
              <Flex>
                <AnimatePresence>
                  {!!sortedQuotes.length && !isLoading && hasUserEnteredAmount && (
                    <FadeTransition>
                      <IconButton
                        variant='ghost'
                        aria-label={translate('trade.quoteStatus')}
                        icon={countdownCircleTimerIcon}
                      />
                    </FadeTransition>
                  )}
                </AnimatePresence>
                <SlippagePopover />
              </Flex>
            </Flex>
          </CardHeader>
          <Stack spacing={0}>
            <SellAssetInput
              accountId={sellAssetAccountId}
              asset={sellAsset}
              label={translate('trade.payWith')}
              onAccountIdChange={setSellAssetAccountId}
              labelPostFix={sellTradeAssetSelect}
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
              />
              <Divider />
            </Flex>
            <TradeAssetInput
              isReadOnly={true}
              accountId={buyAssetAccountId}
              assetId={buyAsset.assetId}
              assetSymbol={buyAsset.symbol}
              assetIcon={buyAsset.icon}
              hideAmounts={true}
              cryptoAmount={
                isSellAmountEntered
                  ? positiveOrZero(buyAmountAfterFeesCryptoPrecision).toFixed()
                  : '0'
              }
              fiatAmount={
                isSellAmountEntered ? positiveOrZero(buyAmountAfterFeesUserCurrency).toFixed() : '0'
              }
              percentOptions={percentOptions}
              showInputSkeleton={isLoading}
              showFiatSkeleton={isLoading}
              label={translate('trade.youGet')}
              onAccountIdChange={setBuyAssetAccountId}
              isAccountSelectionDisabled={!swapperSupportsCrossAccountTrade}
              formControlProps={formControlProps}
              labelPostFix={buyTradeAssetSelect}
            >
              <Collapse in={!!sortedQuotes.length && hasUserEnteredAmount}>
                {MaybeRenderedTradeQuotes}
              </Collapse>
            </TradeAssetInput>
          </Stack>
          {ConfirmSummary}
        </Stack>
      </SlideTransition>
    </MessageOverlay>
  )
})
