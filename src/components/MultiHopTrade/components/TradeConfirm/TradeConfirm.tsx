import { WarningTwoIcon } from '@chakra-ui/icons'
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Button,
  Divider,
  Flex,
  Link,
  Skeleton,
  Stack,
  StackDivider,
  useColorModeValue,
} from '@chakra-ui/react'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { Amount } from 'components/Amount/Amount'
import { Card } from 'components/Card/Card'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { AssetToAsset } from 'components/MultiHopTrade/components/TradeConfirm/AssetToAsset'
import { ReceiveSummary } from 'components/MultiHopTrade/components/TradeConfirm/ReceiveSummary'
import { WithBackButton } from 'components/MultiHopTrade/components/WithBackButton'
import { getMixpanelEventData } from 'components/MultiHopTrade/helpers'
import { useTradeExecution } from 'components/MultiHopTrade/hooks/useTradeExecution/useTradeExecution'
import { chainSupportsTxHistory } from 'components/MultiHopTrade/utils'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero, positiveOrZero } from 'lib/bignumber/bignumber'
import { getTxLink } from 'lib/getTxLink'
import { firstNonZeroDecimal } from 'lib/math'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvents } from 'lib/mixpanel/types'
import { SwapperName } from 'lib/swapper/api'
import { assertUnreachable } from 'lib/utils'
import { selectManualReceiveAddress } from 'state/slices/swappersSlice/selectors'
import {
  selectActiveQuote,
  selectActiveStepOrDefault,
  selectActiveSwapperName,
  selectBuyAmountBeforeFeesCryptoPrecision,
  selectBuyAmountBeforeFeesUserCurrency,
  selectFirstHop,
  selectFirstHopNetworkFeeCryptoPrecision,
  selectFirstHopSellAsset,
  selectFirstHopSellFeeAsset,
  selectLastHop,
  selectLastHopBuyAsset,
  selectNetBuyAmountCryptoPrecision,
  selectNetBuyAmountUserCurrency,
  selectQuoteDonationAmountUserCurrency,
  selectSellAmountBeforeFeesCryptoPrecision,
  selectSellAmountUserCurrency,
  selectTotalNetworkFeeUserCurrencyPrecision,
  selectTradeSlippagePercentageDecimal,
} from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

import { TradeRoutePaths } from '../../types'
import { PriceImpact } from '../PriceImpact'

export const TradeConfirm = () => {
  const history = useHistory()
  const mixpanel = getMixPanel()
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  const alertColor = useColorModeValue('yellow.500', 'yellow.200')
  const warningColor = useColorModeValue('red.600', 'red.400')
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

  const tradeQuote = useAppSelector(selectActiveQuote)

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
  const netBuyAmountCryptoPrecision = useAppSelector(selectNetBuyAmountCryptoPrecision)
  const slippageDecimal = useAppSelector(selectTradeSlippagePercentageDecimal)
  const netBuyAmountUserCurrency = useAppSelector(selectNetBuyAmountUserCurrency)
  const buyAmountBeforeFeesUserCurrency = useAppSelector(selectBuyAmountBeforeFeesUserCurrency)
  const sellAmountBeforeFeesUserCurrency = useAppSelector(selectSellAmountUserCurrency)
  const networkFeeCryptoHuman = useAppSelector(selectFirstHopNetworkFeeCryptoPrecision)
  const networkFeeUserCurrency = useAppSelector(selectTotalNetworkFeeUserCurrencyPrecision)
  const buyAmountBeforeFeesCryptoPrecision = useAppSelector(
    selectBuyAmountBeforeFeesCryptoPrecision,
  )
  const sellAmountBeforeFeesCryptoPrecision = useAppSelector(
    selectSellAmountBeforeFeesCryptoPrecision,
  )
  const donationAmount = useAppSelector(selectQuoteDonationAmountUserCurrency)

  const sellAsset = useAppSelector(selectFirstHopSellAsset)
  const buyAsset = useAppSelector(selectLastHopBuyAsset)
  const maybeManualReceiveAddress = useAppSelector(selectManualReceiveAddress)

  const {
    executeTrade,
    sellTxHash,
    buyTxHash,
    tradeStatus: status,
  } = useTradeExecution({ tradeQuote, swapperName })

  const txHash = buyTxHash ?? sellTxHash

  const priceImpactPercentage = useMemo(() => {
    if (!sellAmountBeforeFeesUserCurrency || !buyAmountBeforeFeesUserCurrency) return bn(0)

    const tradeDifference = bn(sellAmountBeforeFeesUserCurrency)
      .minus(buyAmountBeforeFeesUserCurrency)
      .abs()

    return tradeDifference.div(sellAmountBeforeFeesUserCurrency).times(100)
  }, [sellAmountBeforeFeesUserCurrency, buyAmountBeforeFeesUserCurrency])

  const isHighPriceImpact = useMemo(() => {
    if (!priceImpactPercentage) return false

    return priceImpactPercentage.gt(10)
  }, [priceImpactPercentage])

  const isModeratePriceImpact = useMemo(() => {
    if (!priceImpactPercentage) return false

    return bn(priceImpactPercentage).gt(5)
  }, [priceImpactPercentage])

  const getSellTxLink = useCallback(
    (sellTxHash: string) =>
      getTxLink({
        name: tradeQuoteStep?.sources[0]?.name,
        defaultExplorerBaseUrl: tradeQuoteStep?.sellAsset.explorerTxLink ?? '',
        tradeId: sellTxHash,
      }),
    [tradeQuoteStep?.sellAsset.explorerTxLink, tradeQuoteStep?.sources],
  )

  const getBuyTxLink = useCallback(
    (buyTxHash: string) =>
      getTxLink({
        name: lastStep?.sources[0]?.name,
        defaultExplorerBaseUrl: lastStep?.buyAsset.explorerTxLink ?? '',
        txId: buyTxHash,
      }),
    [lastStep?.buyAsset.explorerTxLink, lastStep?.sources],
  )

  const txLink = useMemo(() => {
    if (buyTxHash) return getBuyTxLink(buyTxHash)
    if (sellTxHash) return getSellTxLink(sellTxHash)
  }, [buyTxHash, getBuyTxLink, getSellTxLink, sellTxHash])

  useEffect(() => {
    if (!mixpanel || !eventData || hasMixpanelFired) return
    if (status === TxStatus.Confirmed) {
      mixpanel.track(MixPanelEvents.TradeSuccess, eventData)
      setHasMixpanelFired(true)
    }
    if (status === TxStatus.Failed) {
      mixpanel.track(MixPanelEvents.TradeFailed, eventData)
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
        mixpanel.track(MixPanelEvents.TradeConfirm, eventData)
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
        <Card.Header px={0} pt={0}>
          <WithBackButton handleBack={handleBack}>
            <Card.Heading textAlign='center'>
              <Text translation={statusText} />
            </Card.Heading>
          </WithBackButton>
        </Card.Header>
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
      <Stack spacing={4}>
        <Row>
          <Row.Label>{translate('common.send')}</Row.Label>
          <Row.Value textAlign='right'>
            <Amount.Crypto
              value={sellAmountBeforeFeesCryptoPrecision ?? ''}
              symbol={sellAsset?.symbol ?? ''}
            />
            <Amount.Fiat
              color='gray.500'
              value={bnOrZero(sellAmountBeforeFeesUserCurrency).toFixed(2)}
              prefix='≈'
            />
          </Row.Value>
        </Row>
        <ReceiveSummary
          symbol={buyAsset?.symbol ?? ''}
          amountCryptoPrecision={netBuyAmountCryptoPrecision ?? ''}
          amountBeforeFeesCryptoPrecision={buyAmountBeforeFeesCryptoPrecision ?? ''}
          protocolFees={tradeQuoteStep?.feeData.protocolFees}
          shapeShiftFee='0'
          slippage={slippageDecimal}
          fiatAmount={positiveOrZero(netBuyAmountUserCurrency).toFixed(2)}
          swapperName={swapperName ?? ''}
          intermediaryTransactionOutputs={tradeQuoteStep?.intermediaryTransactionOutputs}
          donationAmount={donationAmount}
        />
      </Stack>
    ),
    [
      translate,
      sellAmountBeforeFeesCryptoPrecision,
      sellAsset?.symbol,
      sellAmountBeforeFeesUserCurrency,
      buyAsset?.symbol,
      netBuyAmountCryptoPrecision,
      buyAmountBeforeFeesCryptoPrecision,
      tradeQuoteStep?.feeData.protocolFees,
      tradeQuoteStep?.intermediaryTransactionOutputs,
      slippageDecimal,
      netBuyAmountUserCurrency,
      swapperName,
      donationAmount,
    ],
  )

  const footer: JSX.Element = useMemo(
    () => (
      <Card.Footer px={0} py={0}>
        {!txHash && !isSubmitting && (
          <>
            {swapperName === SwapperName.LIFI && (
              <Alert status='warning' fontSize='sm' mt={6}>
                <AlertIcon />
                {translate('trade.lifiWarning')}
              </Alert>
            )}
            <Button
              colorScheme={isModeratePriceImpact ? 'red' : 'blue'}
              size='lg'
              width='full'
              mt={6}
              data-test='trade-form-confirm-and-trade-button'
              type='submit'
            >
              <Text
                translation={isModeratePriceImpact ? 'trade.tradeAnyway' : 'trade.confirmAndTrade'}
              />
            </Button>
          </>
        )}
      </Card.Footer>
    ),
    [txHash, isSubmitting, swapperName, translate, isModeratePriceImpact],
  )

  if (!tradeQuoteStep) return null

  return (
    <SlideTransition>
      <Box as='form' onSubmit={handleSubmit(onSubmit)}>
        <Card variant='unstyled'>
          {header}
          <Card.Body pb={0} px={0}>
            <Stack
              spacing={4}
              borderColor={borderColor}
              divider={<StackDivider />}
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
              />
              {tradeWarning}
              {sendReceiveSummary}
              <Stack spacing={4}>
                {txLink && (
                  <Row>
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
                {isModeratePriceImpact && (
                  <PriceImpact impactPercentage={bn(priceImpactPercentage).toFixed(2)} />
                )}
                <Row>
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
                      {!!swapperName && <RawText color='gray.500'>@{swapperName}</RawText>}
                    </Box>
                  </Skeleton>
                </Row>
                <Row>
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
                  <Row>
                    <HelperTooltip label={translate('trade.tooltip.manualReceiveAddress')}>
                      <Row.Label>
                        <Text translation='trade.manualReceiveAddress' />
                      </Row.Label>
                    </HelperTooltip>
                    <Row.Value>
                      <Row.Label>
                        <RawText fontWeight='semibold' color={alertColor}>
                          {maybeManualReceiveAddress}
                        </RawText>
                      </Row.Label>
                    </Row.Value>
                  </Row>
                )}
                {isFeeRatioOverThreshold && (
                  <Flex justifyContent='center' gap={4} alignItems='center'>
                    <WarningTwoIcon w={5} h={5} color={warningColor} />
                    <Text
                      color={warningColor}
                      translation={[
                        'trade.gasFeeExceedsTradeAmountThreshold',
                        { percentage: networkFeeToTradeRatioPercentage.toFixed(0) },
                      ]}
                    />
                  </Flex>
                )}
              </Stack>
            </Stack>
          </Card.Body>
          {footer}
        </Card>
      </Box>
    </SlideTransition>
  )
}
