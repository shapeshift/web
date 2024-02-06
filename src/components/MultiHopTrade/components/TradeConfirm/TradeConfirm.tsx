import { WarningIcon } from '@chakra-ui/icons'
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Button,
  CardBody,
  CardFooter,
  CardHeader,
  Divider,
  Flex,
  Heading,
  Link,
  Progress,
  Skeleton,
  Stack,
  StackDivider,
  useColorModeValue,
} from '@chakra-ui/react'
import { SwapperName } from '@shapeshiftoss/swapper'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { Amount } from 'components/Amount/Amount'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { AssetToAsset } from 'components/MultiHopTrade/components/TradeConfirm/AssetToAsset'
import { ReceiveSummary } from 'components/MultiHopTrade/components/TradeConfirm/ReceiveSummary'
import { WithBackButton } from 'components/MultiHopTrade/components/WithBackButton'
import { getMixpanelEventData } from 'components/MultiHopTrade/helpers'
import { usePriceImpact } from 'components/MultiHopTrade/hooks/quoteValidation/usePriceImpact'
import { useThorStreamingProgress } from 'components/MultiHopTrade/hooks/useThorStreamingProgress/useThorStreamingProgress'
import { useTradeExecution } from 'components/MultiHopTrade/hooks/useTradeExecution/useTradeExecution'
import { chainSupportsTxHistory } from 'components/MultiHopTrade/utils'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import type { TextPropTypes } from 'components/Text/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero, positiveOrZero } from 'lib/bignumber/bignumber'
import { getTxLink } from 'lib/getTxLink'
import { firstNonZeroDecimal } from 'lib/math'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'
import {
  THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE,
  THORCHAIN_STREAM_SWAP_SOURCE,
} from 'lib/swapper/swappers/ThorchainSwapper/constants'
import { assertUnreachable } from 'lib/utils'
import { selectManualReceiveAddress } from 'state/slices/tradeInputSlice/selectors'
import {
  selectActiveQuote,
  selectActiveStepOrDefault,
  selectActiveSwapperName,
  selectBuyAmountAfterFeesCryptoPrecision,
  selectBuyAmountAfterFeesUserCurrency,
  selectBuyAmountBeforeFeesCryptoPrecision,
  selectFirstHop,
  selectFirstHopNetworkFeeCryptoPrecision,
  selectFirstHopSellAsset,
  selectFirstHopSellFeeAsset,
  selectLastHop,
  selectLastHopBuyAsset,
  selectQuoteSellAmountBeforeFeesCryptoPrecision,
  selectQuoteSellAmountUserCurrency,
  selectTotalNetworkFeeUserCurrencyPrecision,
  selectTradeSlippagePercentageDecimal,
} from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

import { TradeRoutePaths } from '../../types'
import { PriceImpact } from '../PriceImpact'

const stackDivider = <StackDivider />

export const TradeConfirm = () => {
  const history = useHistory()
  const mixpanel = getMixPanel()
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  const alertColor = useColorModeValue('yellow.500', 'yellow.200')
  const tradeQuote = useAppSelector(selectActiveQuote)
  const { isModeratePriceImpact, priceImpactPercentage, isHighPriceImpact } =
    usePriceImpact(tradeQuote)
  const [hasMixpanelFired, setHasMixpanelFired] = useState(false)
  const {
    handleSubmit,
    formState: { isSubmitting },
  } = useFormContext()
  const translate = useTranslate()
  const dispatch = useAppDispatch()

  const { showErrorToast } = useErrorHandler()
  const eventData = getMixpanelEventData()

  const {
    number: { toFiat },
  } = useLocaleFormatter()

  const {
    state: { isConnected, wallet },
    dispatch: walletDispatch,
  } = useWallet()

  const activeStepOrDefault = useAppSelector(selectActiveStepOrDefault)

  useEffect(() => {
    // WARNING: do not remove.
    // clear the confirmed quote on dismount to prevent stale data affecting the selectors
    return () => {
      // TODO(gomes): This is wrong. This isn't only working on unmount as the intent suggests.
      // This is due to the way those react-router routes work. This is actually fired on mount, voiding the stated guarantees.
      // We will most likely want to move all these "WARNING: do not remove" effects up to the router-level, so they are *actually* fired on trade routes unmount
      dispatch(tradeQuoteSlice.actions.resetConfirmedQuote())

      if (activeStepOrDefault > 0) dispatch(tradeQuoteSlice.actions.resetActiveStep())
    }
  }, [activeStepOrDefault, dispatch])

  useEffect(() => {
    if (!tradeQuote) return
    // WARNING: do not remove.
    // clear the confirmed quote on TradeInput unmount to prevent stale data affecting the selectors
    // This sets it back as confirmedQuote, so tradeQuoteSlice action have access to the up-to-date quote
    // TODO(gomes): this seems redundant if we're clearing it then setting it again here - can we remove both TradeInput unmount effect, and this one?
    dispatch(tradeQuoteSlice.actions.setConfirmedQuote(tradeQuote))
  }, [dispatch, tradeQuote])

  const tradeQuoteStep = useAppSelector(selectFirstHop)
  const lastStep = useAppSelector(selectLastHop)
  const swapperName = useAppSelector(selectActiveSwapperName)
  const defaultFeeAsset = useAppSelector(selectFirstHopSellFeeAsset)
  const buyAmountAfterFeesCryptoPrecision = useAppSelector(selectBuyAmountAfterFeesCryptoPrecision)
  const slippageDecimal = useAppSelector(selectTradeSlippagePercentageDecimal)
  const netBuyAmountUserCurrency = useAppSelector(selectBuyAmountAfterFeesUserCurrency)
  const sellAmountBeforeFeesUserCurrency = useAppSelector(selectQuoteSellAmountUserCurrency)
  const networkFeeCryptoHuman = useAppSelector(selectFirstHopNetworkFeeCryptoPrecision)
  const networkFeeUserCurrency = useAppSelector(selectTotalNetworkFeeUserCurrencyPrecision)
  const buyAmountBeforeFeesCryptoPrecision = useAppSelector(
    selectBuyAmountBeforeFeesCryptoPrecision,
  )
  const sellAmountBeforeFeesCryptoPrecision = useAppSelector(
    selectQuoteSellAmountBeforeFeesCryptoPrecision,
  )

  const sellAsset = useAppSelector(selectFirstHopSellAsset)
  const buyAsset = useAppSelector(selectLastHopBuyAsset)
  const maybeManualReceiveAddress = useAppSelector(selectManualReceiveAddress)

  const { executeTrade, sellTxHash, buyTxHash, tradeStatus: status } = useTradeExecution()

  const txHash = buyTxHash ?? sellTxHash

  const isThorStreamingSwap = useMemo(
    () =>
      tradeQuoteStep?.source === THORCHAIN_STREAM_SWAP_SOURCE ||
      tradeQuoteStep?.source === THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE,
    [tradeQuoteStep?.source],
  )

  const {
    attemptedSwapCount,
    progressProps: thorStreamingSwapProgressProps,
    totalSwapCount,
    failedSwaps,
  } = useThorStreamingProgress(sellTxHash, isThorStreamingSwap)

  const getSellTxLink = useCallback(
    (sellTxHash: string) =>
      getTxLink({
        name: tradeQuoteStep?.source,
        defaultExplorerBaseUrl: tradeQuoteStep?.sellAsset.explorerTxLink ?? '',
        tradeId: sellTxHash,
      }),
    [tradeQuoteStep?.sellAsset.explorerTxLink, tradeQuoteStep?.source],
  )

  const getBuyTxLink = useCallback(
    (buyTxHash: string) =>
      getTxLink({
        name: lastStep?.source,
        defaultExplorerBaseUrl: lastStep?.buyAsset.explorerTxLink ?? '',
        txId: buyTxHash,
      }),
    [lastStep?.buyAsset.explorerTxLink, lastStep?.source],
  )

  const txLink = useMemo(() => {
    if (buyTxHash) return getBuyTxLink(buyTxHash)
    if (sellTxHash) return getSellTxLink(sellTxHash)
  }, [buyTxHash, getBuyTxLink, getSellTxLink, sellTxHash])

  useEffect(() => {
    if (!mixpanel || !eventData || hasMixpanelFired) return
    if (status === TxStatus.Confirmed) {
      mixpanel.track(MixPanelEvent.TradeSuccess, eventData)
      setHasMixpanelFired(true)
    }
    if (status === TxStatus.Failed) {
      mixpanel.track(MixPanelEvent.TradeFailed, eventData)
      setHasMixpanelFired(true)
    }
  }, [eventData, hasMixpanelFired, mixpanel, status])

  const handleBack = useCallback(() => {
    if (txHash) {
      dispatch(tradeQuoteSlice.actions.clear())
    }
    history.push(TradeRoutePaths.Input)
  }, [dispatch, history, txHash])

  const onSubmit = useCallback(async () => {
    try {
      if (!isConnected || !wallet) {
        /**
         * call handleBack to reset current form state
         * before opening the connect wallet modal.
         */
        handleBack()
        walletDispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
        return
      }

      const shouldContinueTrade =
        !isHighPriceImpact ||
        !priceImpactPercentage ||
        window.confirm(
          translate('trade.priceImpactWarning', {
            priceImpactPercentage: priceImpactPercentage.toFixed(2),
          }),
        )

      if (!shouldContinueTrade) return

      await executeTrade()
      // only track after swapper successfully executes trade
      // otherwise unsigned txs will be tracked as confirmed trades
      if (mixpanel && eventData) {
        mixpanel.track(MixPanelEvent.TradeConfirm, eventData)
      }
    } catch (e) {
      showErrorToast(e)
      dispatch(tradeQuoteSlice.actions.clear())
      history.push(TradeRoutePaths.Input)
    }
  }, [
    dispatch,
    eventData,
    executeTrade,
    handleBack,
    history,
    isConnected,
    isHighPriceImpact,
    mixpanel,
    priceImpactPercentage,
    showErrorToast,
    translate,
    wallet,
    walletDispatch,
  ])

  // Ratio of the fiat value of the gas fee to the fiat value of the trade value express in percentage
  const networkFeeToTradeRatioPercentage = bnOrZero(networkFeeUserCurrency)
    .dividedBy(sellAmountBeforeFeesUserCurrency ?? 1)
    .times(100)
    .toNumber()
  const networkFeeToTradeRatioPercentageThreshold = 5
  const isFeeRatioOverThreshold =
    networkFeeToTradeRatioPercentage > networkFeeToTradeRatioPercentageThreshold

  const header: JSX.Element = useMemo(() => {
    const statusText: string = (() => {
      switch (status) {
        case TxStatus.Confirmed:
          return 'trade.complete'
        case TxStatus.Failed:
          return 'trade.error.title'
        case TxStatus.Pending:
          return 'trade.pending'
        case TxStatus.Unknown:
          return 'trade.confirmDetails'
        default:
          assertUnreachable(status)
      }
    })()
    return (
      <>
        <CardHeader>
          <WithBackButton handleBack={handleBack}>
            <Heading as='h5' textAlign='center'>
              <Text translation={statusText} />
            </Heading>
          </WithBackButton>
        </CardHeader>
        <Divider />
      </>
    )
  }, [handleBack, status])

  const tradeWarning: JSX.Element | null = useMemo(() => {
    const isSlowSwapper =
      swapperName &&
      [SwapperName.Thorchain, SwapperName.CowSwap, SwapperName.LIFI].includes(swapperName)

    const isTxHistorySupportedForChain = buyAsset && chainSupportsTxHistory(buyAsset.chainId)

    const shouldRenderWarnings = isSlowSwapper || !isTxHistorySupportedForChain

    if (!buyAsset || !shouldRenderWarnings) return null

    return (
      <Flex direction='column' gap={2}>
        {isSlowSwapper && (
          <Alert status='info' width='auto' fontSize='sm'>
            <AlertIcon />
            <Stack spacing={0}>
              <AlertTitle>{translate('trade.slowSwapTitle', { protocol: swapperName })}</AlertTitle>
              <AlertDescription lineHeight='short'>
                {translate('trade.slowSwapBody')}
              </AlertDescription>
            </Stack>
          </Alert>
        )}
        {!chainSupportsTxHistory(buyAsset.chainId) && (
          <Alert status='info' width='auto' mb={3} fontSize='sm'>
            <AlertIcon />
            <Stack spacing={0}>
              <AlertDescription lineHeight='short'>
                {translate('trade.intoAssetSymbolBody', {
                  assetSymbol: buyAsset.symbol,
                })}
              </AlertDescription>
            </Stack>
          </Alert>
        )}
      </Flex>
    )
  }, [swapperName, buyAsset, translate])

  const sendReceiveSummary: JSX.Element | null = useMemo(
    () => (
      <>
        <Row>
          <Row.Label>{translate('common.send')}</Row.Label>
          <Row.Value textAlign='right'>
            <Amount.Crypto
              value={sellAmountBeforeFeesCryptoPrecision ?? ''}
              symbol={sellAsset?.symbol ?? ''}
            />
            <Amount.Fiat
              color='text.subtle'
              value={bnOrZero(sellAmountBeforeFeesUserCurrency).toFixed(2)}
              prefix='≈'
            />
          </Row.Value>
        </Row>
        <ReceiveSummary
          symbol={buyAsset?.symbol ?? ''}
          amountCryptoPrecision={buyAmountAfterFeesCryptoPrecision ?? ''}
          amountBeforeFeesCryptoPrecision={buyAmountBeforeFeesCryptoPrecision ?? ''}
          protocolFees={tradeQuoteStep?.feeData.protocolFees}
          slippageDecimalPercentage={slippageDecimal}
          fiatAmount={positiveOrZero(netBuyAmountUserCurrency).toFixed(2)}
          swapperName={swapperName ?? ''}
          intermediaryTransactionOutputs={tradeQuoteStep?.intermediaryTransactionOutputs}
          swapSource={tradeQuoteStep?.source}
        />
      </>
    ),
    [
      buyAmountAfterFeesCryptoPrecision,
      buyAmountBeforeFeesCryptoPrecision,
      buyAsset?.symbol,
      netBuyAmountUserCurrency,
      sellAmountBeforeFeesCryptoPrecision,
      sellAmountBeforeFeesUserCurrency,
      sellAsset?.symbol,
      slippageDecimal,
      swapperName,
      tradeQuoteStep?.feeData.protocolFees,
      tradeQuoteStep?.intermediaryTransactionOutputs,
      tradeQuoteStep?.source,
      translate,
    ],
  )

  const gasFeeExceedsTradeAmountThresholdTranslation: TextPropTypes['translation'] = useMemo(
    () => [
      'trade.gasFeeExceedsTradeAmountThreshold',
      { percentage: networkFeeToTradeRatioPercentage.toFixed(0) },
    ],
    [networkFeeToTradeRatioPercentage],
  )

  const footer: JSX.Element = useMemo(
    () => (
      <CardFooter flexDir='column' gap={2} px={4}>
        {!txHash && !isSubmitting && (
          <>
            {tradeWarning}
            {swapperName === SwapperName.LIFI && (
              <Alert status='warning' size='sm'>
                <AlertIcon />
                <AlertDescription>{translate('trade.lifiWarning')}</AlertDescription>
              </Alert>
            )}
            {isFeeRatioOverThreshold && (
              <Alert status='warning' size='sm'>
                <AlertIcon />
                <AlertDescription>
                  <Text translation={gasFeeExceedsTradeAmountThresholdTranslation} />
                </AlertDescription>
              </Alert>
            )}
            <Button
              colorScheme={isModeratePriceImpact ? 'red' : 'blue'}
              size='lg'
              width='full'
              data-test='trade-form-confirm-and-trade-button'
              type='submit'
            >
              <Text
                translation={isModeratePriceImpact ? 'trade.tradeAnyway' : 'trade.confirmAndTrade'}
              />
            </Button>
          </>
        )}
      </CardFooter>
    ),
    [
      txHash,
      isSubmitting,
      tradeWarning,
      swapperName,
      translate,
      isFeeRatioOverThreshold,
      gasFeeExceedsTradeAmountThresholdTranslation,
      isModeratePriceImpact,
    ],
  )

  const handleFormSubmit = useMemo(() => handleSubmit(onSubmit), [handleSubmit, onSubmit])

  if (!tradeQuoteStep) return null

  return (
    <SlideTransition>
      <Box as='form' onSubmit={handleFormSubmit}>
        {header}
        <CardBody px={0}>
          <Stack
            spacing={4}
            borderColor={borderColor}
            divider={stackDivider}
            fontSize='sm'
            fontWeight='medium'
          >
            <AssetToAsset
              buyIcon={buyAsset?.icon ?? ''}
              sellIcon={sellAsset?.icon ?? ''}
              buyColor={buyAsset?.color ?? ''}
              sellColor={sellAsset?.color ?? ''}
              status={status}
              isSubmitting={isSubmitting}
              px={4}
            />
            {status !== TxStatus.Unknown && isThorStreamingSwap && (
              <Stack px={4}>
                <Row>
                  <Row.Label>{translate('trade.streamStatus')}</Row.Label>
                  {totalSwapCount > 0 && (
                    <Row.Value>{`${attemptedSwapCount} of ${totalSwapCount}`}</Row.Value>
                  )}
                </Row>
                <Row>
                  <Progress
                    width='full'
                    borderRadius='full'
                    size='sm'
                    {...thorStreamingSwapProgressProps}
                  />
                </Row>
                {failedSwaps.length > 0 && (
                  <Row>
                    <Row.Value display='flex' alignItems='center' gap={1} color='text.warning'>
                      <WarningIcon />
                      {translate('trade.swapsFailed', { failedSwaps: failedSwaps.length })}
                    </Row.Value>
                    {/* TODO: provide details of streaming swap failures - needs details modal
                      <Row.Value>
                        <Button variant='link' colorScheme='blue' fontSize='sm'>
                          {translate('common.learnMore')}
                        </Button>
                      </Row.Value>
                    */}
                  </Row>
                )}
              </Stack>
            )}
            <Stack px={4}>{sendReceiveSummary}</Stack>
            <Stack spacing={4}>
              {txLink && (
                <Row px={4}>
                  <Row.Label>
                    <RawText>{translate('common.txId')}</RawText>
                  </Row.Label>
                  <Box textAlign='right'>
                    <Link isExternal color='blue.500' href={txLink}>
                      <Text translation='trade.viewTransaction' />
                    </Link>
                  </Box>
                </Row>
              )}
              <Row px={4}>
                {isModeratePriceImpact && priceImpactPercentage && (
                  <PriceImpact impactPercentage={priceImpactPercentage.toFixed(2)} />
                )}
              </Row>
              <Row px={4}>
                <HelperTooltip label={translate('trade.tooltip.rate')}>
                  <Row.Label>
                    <Text translation='trade.rate' />
                  </Row.Label>
                </HelperTooltip>
                <Skeleton isLoaded>
                  <Box textAlign='right'>
                    <RawText>{`1 ${sellAsset?.symbol ?? ''} = ${firstNonZeroDecimal(
                      bnOrZero(tradeQuoteStep?.rate),
                    )} ${buyAsset?.symbol}`}</RawText>
                    {!!swapperName && (
                      // This works because we currently only support Li.Fi trades with a single hop,
                      // TODO(woodenfurniture): ensure we show the swapper name, not the first hop source, when we support multi-hop trades
                      <RawText color='text.subtle'>@{tradeQuoteStep.source}</RawText>
                    )}
                  </Box>
                </Skeleton>
              </Row>
              <Row px={4}>
                <HelperTooltip label={translate('trade.tooltip.minerFee')}>
                  <Row.Label>
                    <Text translation='trade.minerFee' />
                  </Row.Label>
                </HelperTooltip>
                <Row.Value>
                  {defaultFeeAsset &&
                    networkFeeUserCurrency &&
                    `${networkFeeCryptoHuman} ${defaultFeeAsset.symbol} ≃ ${toFiat(
                      networkFeeUserCurrency,
                    )}`}
                </Row.Value>
              </Row>
              {maybeManualReceiveAddress && (
                <Row px={4}>
                  <HelperTooltip label={translate('trade.tooltip.manualReceiveAddress')}>
                    <Row.Label>
                      <Text translation='trade.manualReceiveAddress' />
                    </Row.Label>
                  </HelperTooltip>
                  <Row.Value>
                    <Row.Label>
                      <MiddleEllipsis
                        value={maybeManualReceiveAddress}
                        fontWeight='semibold'
                        color={alertColor}
                      />
                    </Row.Label>
                  </Row.Value>
                </Row>
              )}
            </Stack>
          </Stack>
        </CardBody>
        {footer}
      </Box>
    </SlideTransition>
  )
}
