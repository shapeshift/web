import {
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Flex,
  Skeleton,
  Tag,
  useColorModeValue,
} from '@chakra-ui/react'
import prettyMilliseconds from 'pretty-ms'
import type { FC } from 'react'
import { useCallback, useMemo } from 'react'
import { FaGasPump, FaRegClock } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { quoteStatusTranslation } from 'components/MultiHopTrade/components/TradeInput/components/TradeQuotes/getQuoteErrorTranslation'
import { useIsTradingActive } from 'components/MultiHopTrade/hooks/useIsTradingActive'
import { RawText } from 'components/Text'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { SwapErrorType } from 'lib/swapper/types'
import type { ApiQuote } from 'state/apis/swappers'
import {
  selectAssets,
  selectBuyAsset,
  selectFeeAssetByChainId,
  selectMarketDataById,
  selectSellAmountCryptoPrecision,
  selectSellAsset,
} from 'state/slices/selectors'
import {
  getBuyAmountAfterFeesCryptoPrecision,
  getTotalNetworkFeeUserCurrencyPrecision,
} from 'state/slices/tradeQuoteSlice/helpers'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

import { SwapperIcon } from '../SwapperIcon/SwapperIcon'

type TradeQuoteProps = {
  isActive: boolean
  isBest: boolean
  quoteData: ApiQuote
  bestBuyAmountBeforeFeesCryptoBaseUnit: string
  isLoading: boolean
}

const borderRadius = { base: 'md', md: 'lg' }
const hoverProps = {
  cursor: 'pointer',
  bg: 'background.surface.hover',
}

export const TradeQuoteLoaded: FC<TradeQuoteProps> = ({
  isActive,
  isBest,
  quoteData,
  bestBuyAmountBeforeFeesCryptoBaseUnit,
  isLoading,
}) => {
  const dispatch = useAppDispatch()
  const translate = useTranslate()
  const borderColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.100')
  const redColor = useColorModeValue('red.500', 'red.200')
  const focusColor = useColorModeValue('blackAlpha.400', 'whiteAlpha.400')

  const { quote, error } = quoteData

  const { isTradingActive } = useIsTradingActive()

  const buyAsset = useAppSelector(selectBuyAsset)
  const sellAsset = useAppSelector(selectSellAsset)
  const assetsById = useAppSelector(selectAssets)

  const buyAssetMarketData = useAppSelector(state =>
    selectMarketDataById(state, buyAsset.assetId ?? ''),
  )

  const sellAmountCryptoPrecision = useAppSelector(selectSellAmountCryptoPrecision)

  // NOTE: don't pull this from the slice - we're not displaying the active quote here
  const networkFeeUserCurrencyPrecision = useMemo(
    () => (quote ? getTotalNetworkFeeUserCurrencyPrecision(quote) : undefined),
    [quote],
  )

  // NOTE: don't pull this from the slice - we're not displaying the active quote here
  const totalReceiveAmountCryptoPrecision = useMemo(
    () =>
      quote
        ? getBuyAmountAfterFeesCryptoPrecision({
            quote,
          })
        : '0',
    [quote],
  )

  const totalReceiveAmountFiatPrecision = useMemo(
    () =>
      bn(totalReceiveAmountCryptoPrecision)
        .times(buyAssetMarketData.price ?? 0)
        .toString(),
    [buyAssetMarketData.price, totalReceiveAmountCryptoPrecision],
  )

  const handleQuoteSelection = useCallback(() => {
    dispatch(tradeQuoteSlice.actions.setActiveQuoteIndex(quoteData.index))
  }, [dispatch, quoteData.index])

  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, sellAsset.chainId ?? ''))
  if (!feeAsset)
    throw new Error(`TradeQuoteLoaded: no fee asset found for chainId ${sellAsset.chainId}!`)

  // the difference percentage is on the gross receive amount only
  const quoteDifferenceDecimalPercentage = useMemo(() => {
    if (!quote) return Infinity
    const lastStep = quote.steps[quote.steps.length - 1]
    return bn(bestBuyAmountBeforeFeesCryptoBaseUnit)
      .minus(lastStep.buyAmountBeforeFeesCryptoBaseUnit)
      .dividedBy(bestBuyAmountBeforeFeesCryptoBaseUnit)
      .toNumber()
  }, [bestBuyAmountBeforeFeesCryptoBaseUnit, quote])

  const isAmountEntered = bnOrZero(sellAmountCryptoPrecision).gt(0)
  const hasNegativeRatio =
    quoteData.inputOutputRatio !== undefined && isAmountEntered && quoteData.inputOutputRatio <= 0

  const hasAmountWithPositiveReceive =
    isAmountEntered &&
    !hasNegativeRatio &&
    bnOrZero(totalReceiveAmountCryptoPrecision).isGreaterThan(0)

  const tag: JSX.Element = useMemo(() => {
    if (quote)
      switch (true) {
        case !hasAmountWithPositiveReceive && isAmountEntered:
          return (
            <Tag size='sm' colorScheme='red'>
              {translate('trade.rates.tags.negativeRatio')}
            </Tag>
          )
        case isBest:
          return (
            <Tag size='sm' colorScheme='green'>
              {translate('common.best')}
            </Tag>
          )
        default:
          return <Tag size='sm'>{translate('common.alternative')}</Tag>
      }
    else {
      // Add helper to get user-friendly error message from code
      return (
        <Tag size='sm' colorScheme='red'>
          {translate(...quoteStatusTranslation(error, assetsById))}
        </Tag>
      )
    }
  }, [quote, hasAmountWithPositiveReceive, isAmountEntered, translate, isBest, error, assetsById])

  const activeSwapperColor = (() => {
    if (!isTradingActive) return redColor
    if (!hasAmountWithPositiveReceive) return redColor
    if (isActive) return 'border.focused'
    return borderColor
  })()

  const activeProps = useMemo(
    () => ({ borderColor: isActive ? 'transparent' : focusColor }),
    [focusColor, isActive],
  )

  const isDisabled = !!error

  // TODO: work out for which error codes we want to show a swapper with a human-readable error vs hiding it
  const showSwapperError =
    error?.code &&
    [
      SwapErrorType.TRADING_HALTED,
      SwapErrorType.UNSUPPORTED_PAIR,
      SwapErrorType.TRADE_QUOTE_AMOUNT_TOO_SMALL,
    ].includes(error.code)

  const showSwapper = !!quote || showSwapperError

  const totalEstimatedExecutionTimeMs = useMemo(
    () =>
      quote?.steps.reduce((acc, step) => {
        return acc + (step.estimatedExecutionTimeMs ?? 0)
      }, 0),
    [quote?.steps],
  )

  return showSwapper ? (
    <>
      <Card
        borderWidth={2}
        boxShadow='none'
        bg={isActive ? 'background.surface.hover' : 'transparent'}
        cursor={isDisabled ? 'not-allowed' : 'pointer'}
        borderColor={isActive ? activeSwapperColor : 'border.base'}
        _hover={isDisabled ? undefined : hoverProps}
        _active={isDisabled ? undefined : activeProps}
        borderRadius={borderRadius}
        size='sm'
        flexDir='column'
        width='full'
        fontSize='sm'
        onClick={isDisabled ? undefined : handleQuoteSelection}
        transitionProperty='common'
        transitionDuration='normal'
      >
        <CardHeader fontWeight='normal' fontSize='sm' pl={3} pr={4}>
          <Flex justifyContent='space-between' alignItems='center'>
            <Flex gap={2} alignItems='center'>
              <SwapperIcon swapperName={quoteData.swapperName} />
              <RawText fontWeight='medium'>
                {quote?.steps[0].source ?? quoteData.swapperName}
              </RawText>
            </Flex>
            <Flex gap={2}>
              <Skeleton isLoaded={!isLoading}>{tag}</Skeleton>
            </Flex>
          </Flex>
        </CardHeader>

        {quote && (
          <CardBody py={2} px={4} display='flex' alignItems='center' justifyContent='space-between'>
            <Flex gap={2} flexDir='column' justifyContent='space-between' alignItems='flex-start'>
              <Flex gap={2} alignItems='center'>
                <Skeleton isLoaded={!isLoading}>
                  <Amount.Crypto
                    value={hasAmountWithPositiveReceive ? totalReceiveAmountCryptoPrecision : '0'}
                    symbol={buyAsset?.symbol ?? ''}
                    fontSize='xl'
                    lineHeight={1}
                  />
                </Skeleton>
                {!isBest &&
                  hasAmountWithPositiveReceive &&
                  quoteDifferenceDecimalPercentage !== 0 && (
                    <Skeleton isLoaded={!isLoading}>
                      <Amount.Percent
                        value={-quoteDifferenceDecimalPercentage}
                        prefix='('
                        suffix=')'
                        autoColor
                      />
                    </Skeleton>
                  )}
              </Flex>
              <Skeleton isLoaded={!isLoading}>
                <Amount.Fiat
                  color='text.subtle'
                  value={totalReceiveAmountFiatPrecision}
                  prefix='≈'
                  lineHeight={1}
                />
              </Skeleton>
            </Flex>
          </CardBody>
        )}

        {quote && (
          <CardFooter px={4} pb={4}>
            <Flex justifyContent='left' alignItems='left' gap={8}>
              {totalEstimatedExecutionTimeMs !== undefined && totalEstimatedExecutionTimeMs > 0 && (
                <Skeleton isLoaded={!isLoading}>
                  <Flex gap={2} alignItems='center'>
                    <RawText color='text.subtle'>
                      <FaRegClock />
                    </RawText>
                    {prettyMilliseconds(totalEstimatedExecutionTimeMs)}
                  </Flex>
                </Skeleton>
              )}
              <Skeleton isLoaded={!isLoading}>
                <Flex gap={2} alignItems='center'>
                  <RawText color='text.subtle'>
                    <FaGasPump />
                  </RawText>

                  {
                    // We cannot infer gas fees in specific scenarios, so if the fee is undefined we must render is as such
                    !networkFeeUserCurrencyPrecision ? (
                      translate('trade.unknownGas')
                    ) : (
                      <Amount.Fiat value={networkFeeUserCurrencyPrecision} />
                    )
                  }
                </Flex>
              </Skeleton>
            </Flex>
          </CardFooter>
        )}
      </Card>
    </>
  ) : null
}

export const TradeQuote: FC<TradeQuoteProps> = props => <TradeQuoteLoaded {...props} />
