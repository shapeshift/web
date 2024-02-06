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
import { SwapperName } from '@shapeshiftoss/swapper'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { usePriceImpact } from 'components/MultiHopTrade/hooks/quoteValidation/usePriceImpact'
import { chainSupportsTxHistory } from 'components/MultiHopTrade/utils'
import { Text } from 'components/Text'
import type { TextPropTypes } from 'components/Text/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import {
  selectActiveQuote,
  selectActiveSwapperName,
  selectLastHopBuyAsset,
  selectQuoteSellAmountUserCurrency,
  selectTotalNetworkFeeUserCurrencyPrecision,
  selectTradeExecutionState,
} from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { TradeExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppDispatch, useAppSelector } from 'state/store'

export const Footer = () => {
  const translate = useTranslate()
  const dispatch = useAppDispatch()
  const swapperName = useAppSelector(selectActiveSwapperName)
  const activeQuote = useAppSelector(selectActiveQuote)
  const lastHopBuyAsset = useAppSelector(selectLastHopBuyAsset)
  const tradeExecutionState = useAppSelector(selectTradeExecutionState)
  const networkFeeUserCurrency = useAppSelector(selectTotalNetworkFeeUserCurrencyPrecision)
  const sellAmountBeforeFeesUserCurrency = useAppSelector(selectQuoteSellAmountUserCurrency)
  const { isModeratePriceImpact } = usePriceImpact(activeQuote)

  const handleConfirm = useCallback(() => {
    dispatch(tradeQuoteSlice.actions.confirmTrade())
  }, [dispatch])

  const networkFeeToTradeRatioPercentage = useMemo(
    () =>
      bnOrZero(networkFeeUserCurrency)
        .dividedBy(sellAmountBeforeFeesUserCurrency ?? 1)
        .times(100)
        .toNumber(),
    [networkFeeUserCurrency, sellAmountBeforeFeesUserCurrency],
  )

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

  const tradeWarning: JSX.Element | null = useMemo(() => {
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
      </Flex>
    )
  }, [swapperName, lastHopBuyAsset, translate])

  const isLoading = useMemo(
    () => tradeExecutionState === TradeExecutionState.Initializing,
    [tradeExecutionState],
  )

  return [TradeExecutionState.Initializing, TradeExecutionState.Previewing].includes(
    tradeExecutionState,
  ) ? (
    <CardFooter
      flexDir='column'
      gap={2}
      px={4}
      borderTopWidth={1}
      borderColor='border.base'
      bg='background.surface.raised.base'
      borderBottomRadius='md'
    >
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
        onClick={handleConfirm}
        isLoading={isLoading}
      >
        <Text translation={isModeratePriceImpact ? 'trade.tradeAnyway' : 'trade.confirmAndTrade'} />
      </Button>
    </CardFooter>
  ) : null
}
