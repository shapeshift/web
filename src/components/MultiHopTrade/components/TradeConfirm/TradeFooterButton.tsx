import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Button,
  CardFooter,
  Flex,
  Stack,
} from '@chakra-ui/react'
import type { SupportedTradeQuoteStepIndex, TradeQuoteStep } from '@shapeshiftoss/swapper'
import { SwapperName } from '@shapeshiftoss/swapper'
import type { FC } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { WarningAcknowledgement } from 'components/Acknowledgement/WarningAcknowledgement'
import { usePriceImpact } from 'components/MultiHopTrade/hooks/quoteValidation/usePriceImpact'
import { chainSupportsTxHistory } from 'components/MultiHopTrade/utils'
import { RawText, Text } from 'components/Text'
import type { TextPropTypes } from 'components/Text/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { assertUnreachable } from 'lib/utils'
import {
  selectActiveQuote,
  selectActiveQuoteErrors,
  selectActiveSwapperName,
  selectConfirmedTradeExecutionState,
  selectHopExecutionMetadata,
  selectLastHopBuyAsset,
  selectQuoteSellAmountUserCurrency,
  selectTotalNetworkFeeUserCurrency,
} from 'state/slices/tradeQuoteSlice/selectors'
import { TradeExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppSelector, useSelectorWithArgs } from 'state/store'

import { getQuoteErrorTranslation } from '../TradeInput/getQuoteErrorTranslation'
import { useStreamingProgress } from './hooks/useStreamingProgress'
import { useTradeButtonProps } from './hooks/useTradeButtonProps'

type TradeFooterButtonProps = {
  tradeQuoteStep: TradeQuoteStep
  currentHopIndex: SupportedTradeQuoteStepIndex
  activeTradeId: string
  isExactAllowance: boolean
  isLoading?: boolean
}

export const TradeFooterButton: FC<TradeFooterButtonProps> = ({
  tradeQuoteStep,
  currentHopIndex,
  activeTradeId,
  isExactAllowance,
  isLoading = false,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [shouldShowWarningAcknowledgement, setShouldShowWarningAcknowledgement] = useState(false)
  const tradeButtonProps = useTradeButtonProps({
    tradeQuoteStep,
    currentHopIndex,
    activeTradeId,
    isExactAllowance,
  })
  const translate = useTranslate()
  const swapperName = useAppSelector(selectActiveSwapperName)
  const lastHopBuyAsset = useAppSelector(selectLastHopBuyAsset)
  const confirmedTradeExecutionState = useAppSelector(selectConfirmedTradeExecutionState)
  const activeQuote = useAppSelector(selectActiveQuote)
  const { isModeratePriceImpact, priceImpactPercentage } = usePriceImpact(activeQuote)
  const firstHopMetadata = useSelectorWithArgs(selectHopExecutionMetadata, {
    tradeId: activeQuote?.id ?? '',
    hopIndex: 0,
  })

  const secondHopMetadata = useSelectorWithArgs(selectHopExecutionMetadata, {
    tradeId: activeQuote?.id ?? '',
    hopIndex: 1,
  })
  const networkFeeUserCurrency = useAppSelector(selectTotalNetworkFeeUserCurrency)
  const sellAmountBeforeFeesUserCurrency = useAppSelector(selectQuoteSellAmountUserCurrency)
  const streamingProgress = useStreamingProgress({
    tradeQuoteStep,
    hopIndex: currentHopIndex,
  })

  const translation: TextPropTypes['translation'] | undefined = useMemo(() => {
    if (!confirmedTradeExecutionState) return undefined
    switch (confirmedTradeExecutionState) {
      case TradeExecutionState.Initializing:
      case TradeExecutionState.Previewing:
        return 'trade.confirmAndTrade'
      case TradeExecutionState.FirstHop:
      case TradeExecutionState.SecondHop:
      case TradeExecutionState.TradeComplete:
        return tradeButtonProps?.buttonText
      default:
        assertUnreachable(confirmedTradeExecutionState)
    }
  }, [confirmedTradeExecutionState, tradeButtonProps?.buttonText])

  const networkFeeToTradeRatioPercentage = useMemo(
    () =>
      bnOrZero(networkFeeUserCurrency)
        .dividedBy(sellAmountBeforeFeesUserCurrency ?? 1)
        .times(100)
        .toNumber(),
    [networkFeeUserCurrency, sellAmountBeforeFeesUserCurrency],
  )

  // Reset the button loading state when the trade execution state changes
  useEffect(() => {
    setIsSubmitting(false)
  }, [firstHopMetadata.state, secondHopMetadata.state])

  const handleSubmit = useCallback(async () => {
    try {
      setIsSubmitting(true)
      await tradeButtonProps?.onSubmit()
    } finally {
      setIsSubmitting(false)
    }
  }, [tradeButtonProps])

  const handleClick = useCallback(() => {
    const isInitializingOrPreviewing =
      confirmedTradeExecutionState === TradeExecutionState.Initializing ||
      confirmedTradeExecutionState === TradeExecutionState.Previewing
    // Only show the warning acknowledgement if the user is previewing the trade
    if (isModeratePriceImpact && isInitializingOrPreviewing) {
      setShouldShowWarningAcknowledgement(true)
    } else {
      handleSubmit()
    }
  }, [isModeratePriceImpact, handleSubmit, confirmedTradeExecutionState])

  // Ratio of the fiat value of the gas fee to the fiat value of the trade value express in percentage
  const isFeeRatioOverThreshold = useMemo(() => {
    const networkFeeToTradeRatioPercentageThreshold = 5
    return networkFeeToTradeRatioPercentage > networkFeeToTradeRatioPercentageThreshold
  }, [networkFeeToTradeRatioPercentage])

  const gasFeeExceedsTradeAmountThresholdTranslation: TextPropTypes['translation'] = useMemo(
    () => [
      'trade.gasFeeExceedsTradeAmountThreshold',
      { percentage: networkFeeToTradeRatioPercentage.toFixed(0) },
    ],
    [networkFeeToTradeRatioPercentage],
  )

  const tradeWarnings: JSX.Element | null = useMemo(() => {
    const isSlowSwapper =
      swapperName &&
      [SwapperName.Thorchain, SwapperName.CowSwap, SwapperName.LIFI].includes(swapperName)

    const isTxHistorySupportedForChain =
      lastHopBuyAsset && chainSupportsTxHistory(lastHopBuyAsset.chainId)

    const shouldRenderWarnings = isSlowSwapper || !isTxHistorySupportedForChain

    if (!shouldRenderWarnings) return null

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
        {!isTxHistorySupportedForChain && (
          <Alert status='info' width='auto' mb={3} fontSize='sm'>
            <AlertIcon />
            <Stack spacing={0}>
              <AlertDescription lineHeight='short'>
                {translate('trade.intoAssetSymbolBody', {
                  assetSymbol: lastHopBuyAsset?.symbol,
                })}
              </AlertDescription>
            </Stack>
          </Alert>
        )}
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
      </Flex>
    )
  }, [
    swapperName,
    lastHopBuyAsset,
    translate,
    isFeeRatioOverThreshold,
    gasFeeExceedsTradeAmountThresholdTranslation,
  ])

  const activeQuoteErrors = useAppSelector(selectActiveQuoteErrors)
  const activeQuoteError = useMemo(() => activeQuoteErrors?.[0], [activeQuoteErrors])

  if (!confirmedTradeExecutionState || !translation || !tradeButtonProps) return null

  return (
    <>
      <WarningAcknowledgement
        message={translate('warningAcknowledgement.highSlippageTrade', {
          slippagePercentage: bnOrZero(priceImpactPercentage).toFixed(2).toString(),
        })}
        onAcknowledge={handleSubmit}
        shouldShowAcknowledgement={shouldShowWarningAcknowledgement}
        setShouldShowAcknowledgement={setShouldShowWarningAcknowledgement}
      />
      <CardFooter flexDir='column' gap={2} px={0} pb={0} borderTop='none'>
        {[TradeExecutionState.Initializing, TradeExecutionState.Previewing].includes(
          confirmedTradeExecutionState,
        ) && tradeWarnings}
        {activeQuoteError && (
          <Alert status='warning' size='sm'>
            <AlertIcon />
            <AlertDescription>
              <Text translation={getQuoteErrorTranslation(activeQuoteError)} />
            </AlertDescription>
          </Alert>
        )}
        {streamingProgress && streamingProgress.failedSwaps.length > 0 && (
          <Alert status='warning' size='sm'>
            <AlertIcon />
            <AlertDescription>
              <RawText>
                {translate('trade.swapsFailed', {
                  failedSwaps: streamingProgress.failedSwaps.length,
                })}
              </RawText>
            </AlertDescription>
          </Alert>
        )}
        <Button
          colorScheme={!!activeQuoteError ? 'red' : 'blue'}
          size='lg'
          width='full'
          onClick={handleClick}
          isLoading={
            isSubmitting ||
            confirmedTradeExecutionState === TradeExecutionState.Initializing ||
            tradeButtonProps.isLoading ||
            isLoading
          }
          isDisabled={tradeButtonProps.isDisabled || !!activeQuoteError}
        >
          <Text translation={translation} />
        </Button>
      </CardFooter>
    </>
  )
}
