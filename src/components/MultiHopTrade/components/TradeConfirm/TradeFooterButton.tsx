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
import type { FC } from 'react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { chainSupportsTxHistory } from 'components/MultiHopTrade/utils'
import { Text } from 'components/Text'
import type { TextPropTypes } from 'components/Text/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import {
  selectActiveSwapperName,
  selectConfirmedTradeExecutionState,
  selectLastHopBuyAsset,
  selectQuoteSellAmountUserCurrency,
  selectTotalNetworkFeeUserCurrency,
} from 'state/slices/tradeQuoteSlice/selectors'
import { TradeExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppSelector } from 'state/store'

type FooterProps = {
  isLoading: boolean
  handleSubmit: () => void
}

export const TradeFooterButton: FC<FooterProps> = ({ isLoading, handleSubmit }) => {
  const translate = useTranslate()
  const swapperName = useAppSelector(selectActiveSwapperName)
  const lastHopBuyAsset = useAppSelector(selectLastHopBuyAsset)
  const confirmedTradeExecutionState = useAppSelector(selectConfirmedTradeExecutionState)
  const networkFeeUserCurrency = useAppSelector(selectTotalNetworkFeeUserCurrency)
  const sellAmountBeforeFeesUserCurrency = useAppSelector(selectQuoteSellAmountUserCurrency)

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

  if (!confirmedTradeExecutionState) return null

  return (
    <CardFooter flexDir='column' gap={2} px={0} pb={0} borderTop='none'>
      {[TradeExecutionState.Initializing, TradeExecutionState.Previewing].includes(
        confirmedTradeExecutionState,
      ) && tradeWarnings}
      <Button
        colorScheme={'blue'}
        size='lg'
        width='full'
        onClick={handleSubmit}
        isLoading={isLoading || confirmedTradeExecutionState === TradeExecutionState.Initializing}
      >
        <Text translation={'trade.confirmAndTrade'} />
      </Button>
    </CardFooter>
  )
}
