import { Card, Flex, Tag, useColorModeValue } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import { FaGasPump } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { quoteStatusTranslation } from 'components/MultiHopTrade/components/TradeInput/components/TradeQuotes/getQuoteErrorTranslation'
import { useIsTradingActive } from 'components/MultiHopTrade/hooks/useIsTradingActive'
import { RawText } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { SwapErrorType } from 'lib/swapper/api'
import type { ApiQuote } from 'state/apis/swappers'
import {
  selectAssets,
  selectBuyAsset,
  selectFeeAssetByChainId,
  selectSellAmountCryptoPrecision,
  selectSellAsset,
} from 'state/slices/selectors'
import {
  getNetReceiveAmountCryptoPrecision,
  getTotalNetworkFeeUserCurrencyPrecision,
} from 'state/slices/tradeQuoteSlice/helpers'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

import { SwapperIcon } from '../SwapperIcon/SwapperIcon'

type TradeQuoteLoadedProps = {
  isActive: boolean
  isBest: boolean
  quoteData: ApiQuote
  bestInputOutputRatio: number
}

/*
 TODO: Add loading skeleton - the below is an implementation for when trade quotes had separate loading states.
 They are now unified.
 */
// const TradeQuoteLoading = () => {
//   const borderColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.100')
//   return (
//     <Stack
//       borderWidth={1}
//       cursor='not-allowed'
//       borderColor={borderColor}
//       borderRadius='xl'
//       flexDir='column'
//       spacing={2}
//       width='full'
//       px={4}
//       py={2}
//       fontSize='sm'
//     >
//       <Flex justifyContent='space-between'>
//         <Stack direction='row' spacing={2}>
//           <Skeleton height='20px' width='50px' />
//           <Skeleton height='20px' width='50px' />
//         </Stack>
//         <Skeleton height='20px' width='80px' />
//       </Flex>
//       <Flex justifyContent='space-between'>
//         <Stack direction='row' alignItems='center'>
//           <SkeletonCircle height='24px' width='24px' />
//           <Skeleton height='21px' width='50px' />
//         </Stack>
//         <Skeleton height='20px' width='100px' />
//       </Flex>
//     </Stack>
//   )
// }

export const TradeQuoteLoaded: React.FC<TradeQuoteLoadedProps> = ({
  isActive,
  isBest,
  quoteData,
  bestInputOutputRatio,
}) => {
  const dispatch = useAppDispatch()
  const translate = useTranslate()
  const borderColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.100')
  const greenColor = useColorModeValue('green.500', 'green.200')
  const redColor = useColorModeValue('red.500', 'red.200')
  const hoverColor = useColorModeValue('blackAlpha.300', 'whiteAlpha.300')
  const focusColor = useColorModeValue('blackAlpha.400', 'whiteAlpha.400')

  const { quote, error } = quoteData

  const { isTradingActive } = useIsTradingActive()

  const buyAsset = useAppSelector(selectBuyAsset)
  const sellAsset = useAppSelector(selectSellAsset)
  const assetsById = useAppSelector(selectAssets)

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
        ? getNetReceiveAmountCryptoPrecision({
            quote,
            swapperName: quoteData.swapperName,
          })
        : '0',
    [quote, quoteData.swapperName],
  )

  const handleQuoteSelection = useCallback(() => {
    dispatch(tradeQuoteSlice.actions.setSwapperName(quoteData.swapperName))
  }, [dispatch, quoteData.swapperName])

  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, sellAsset.chainId ?? ''))
  if (!feeAsset)
    throw new Error(`TradeQuoteLoaded: no fee asset found for chainId ${sellAsset.chainId}!`)

  const quoteDifferenceDecimalPercentage =
    (quoteData.inputOutputRatio / bestInputOutputRatio - 1) * -1

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
    if (isActive) return greenColor
    return borderColor
  })()

  const hoverProps = useMemo(
    () => ({ borderColor: isActive ? activeSwapperColor : hoverColor, cursor: 'pointer' }),
    [activeSwapperColor, hoverColor, isActive],
  )
  const activeProps = useMemo(
    () => ({ borderColor: isActive ? activeSwapperColor : focusColor }),
    [activeSwapperColor, focusColor, isActive],
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

  return showSwapper ? (
    <Card
      borderWidth={1}
      bg='background.surface.raised.accent'
      cursor={isDisabled ? 'not-allowed' : 'pointer'}
      borderColor={isActive ? activeSwapperColor : borderColor}
      _hover={isDisabled ? undefined : hoverProps}
      _active={isDisabled ? undefined : activeProps}
      borderRadius='lg'
      flexDir='column'
      gap={4}
      width='full'
      px={4}
      py={2}
      fontSize='sm'
      onClick={isDisabled ? undefined : handleQuoteSelection}
      transitionProperty='common'
      transitionDuration='normal'
      opacity={isDisabled ? 0.4 : 1}
    >
      <Flex justifyContent='space-between' alignItems='center'>
        <Flex gap={2}>
          {tag}
          {!isBest && hasAmountWithPositiveReceive && (
            <Tag size='sm' colorScheme='red' variant='xs-subtle'>
              <Amount.Percent value={quoteDifferenceDecimalPercentage} suffix='more expensive' />
            </Tag>
          )}
        </Flex>
        {quote && (
          <Flex gap={2} alignItems='center'>
            <RawText color='gray.500'>
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
        )}
      </Flex>
      <Flex justifyContent='space-between' alignItems='center'>
        <Flex gap={2} alignItems='center'>
          <SwapperIcon swapperName={quoteData.swapperName} />
          <RawText>{quoteData.swapperName}</RawText>
        </Flex>
        {quote && (
          <Amount.Crypto
            value={hasAmountWithPositiveReceive ? totalReceiveAmountCryptoPrecision : '0'}
            symbol={buyAsset?.symbol ?? ''}
            color={isBest ? greenColor : 'inherit'}
          />
        )}
      </Flex>
    </Card>
  ) : null
}

export const TradeQuote: React.FC<TradeQuoteLoadedProps> = props => <TradeQuoteLoaded {...props} />
