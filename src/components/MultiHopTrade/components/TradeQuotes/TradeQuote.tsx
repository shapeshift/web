import { Flex, Skeleton, SkeletonCircle, Stack, Tag, useColorModeValue } from '@chakra-ui/react'
import type { Result } from '@sniptt/monads/build'
import { useCallback, useMemo } from 'react'
import { FaGasPump } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { RawText } from 'components/Text'
import { useIsTradingActive } from 'components/Trade/hooks/useIsTradingActive'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { SwapErrorRight } from 'lib/swapper/api'
import { SwapperName } from 'lib/swapper/api'
import type { LifiTradeQuote } from 'lib/swapper/swappers/LifiSwapper/utils/types'
import {
  selectBuyAsset,
  selectFeeAssetByChainId,
  selectSellAmountCryptoPrecision,
  selectSellAsset,
} from 'state/slices/selectors'
import { swappers } from 'state/slices/swappersSlice/swappersSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

import { getNetReceiveAmountCryptoPrecision, getTotalNetworkFeeFiatPrecision } from '../../helpers'
import { SwapperIcon } from '../SwapperIcon/SwapperIcon'

const TradeQuoteLoading = () => {
  const borderColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.100')
  return (
    <Stack
      borderWidth={1}
      cursor='not-allowed'
      borderColor={borderColor}
      borderRadius='xl'
      flexDir='column'
      spacing={2}
      width='full'
      px={4}
      py={2}
      fontSize='sm'
    >
      <Flex justifyContent='space-between'>
        <Stack direction='row' spacing={2}>
          <Skeleton height='20px' width='50px' />
          <Skeleton height='20px' width='50px' />
        </Stack>
        <Skeleton height='20px' width='80px' />
      </Flex>
      <Flex justifyContent='space-between'>
        <Stack direction='row' alignItems='center'>
          <SkeletonCircle height='24px' width='24px' />
          <Skeleton height='21px' width='50px' />
        </Stack>
        <Skeleton height='20px' width='100px' />
      </Flex>
    </Stack>
  )
}

type TradeQuoteLoadedProps = {
  isActive: boolean
  isBest: boolean
  quoteData: {
    isLoading: boolean
    data: Result<LifiTradeQuote<false>, SwapErrorRight> | undefined
    error: unknown
    swapperName: SwapperName
    inputOutputRatio: number
  }
  bestInputOutputRatio: number
}

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

  const { isTradingActive } = useIsTradingActive()

  const buyAsset = useAppSelector(selectBuyAsset)
  const sellAsset = useAppSelector(selectSellAsset)

  const sellAmountCryptoPrecision = useAppSelector(selectSellAmountCryptoPrecision)

  const handleQuoteSelection = useCallback(() => {
    dispatch(swappers.actions.setSelectedQuote(quoteData.swapperName))
  }, [dispatch, quoteData.swapperName])

  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, sellAsset?.chainId ?? ''))
  if (!feeAsset)
    throw new Error(`TradeQuoteLoaded: no fee asset found for chainId ${sellAsset?.chainId}!`)

  const quote = quoteData?.data?.isOk() ? quoteData.data.unwrap() : undefined

  const networkFeeFiatPrecision = useMemo(
    () => (quote ? getTotalNetworkFeeFiatPrecision(quote) : '0'),
    [quote],
  )

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

  const quoteDifferenceDecimalPercentage = quoteData.inputOutputRatio / bestInputOutputRatio - 1

  const isAmountEntered = bnOrZero(sellAmountCryptoPrecision).gt(0)
  const hasNegativeRatio =
    quoteData.inputOutputRatio !== undefined && isAmountEntered && quoteData.inputOutputRatio <= 0

  const hasAmountWithPositiveReceive =
    isAmountEntered &&
    !hasNegativeRatio &&
    bnOrZero(totalReceiveAmountCryptoPrecision).isGreaterThan(0)

  const tag: JSX.Element = useMemo(() => {
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
  }, [hasAmountWithPositiveReceive, isAmountEntered, translate, isBest])

  const activeSwapperColor = (() => {
    if (!isTradingActive) return redColor
    if (!hasAmountWithPositiveReceive) return redColor
    if (isActive) return greenColor
    return borderColor
  })()

  return totalReceiveAmountCryptoPrecision ? (
    <Flex
      borderWidth={1}
      cursor='pointer'
      borderColor={isActive ? activeSwapperColor : borderColor}
      _hover={{ borderColor: isActive ? activeSwapperColor : hoverColor }}
      _active={{ borderColor: isActive ? activeSwapperColor : focusColor }}
      borderRadius='xl'
      flexDir='column'
      gap={2}
      width='full'
      px={4}
      py={2}
      fontSize='sm'
      onClick={handleQuoteSelection}
      transitionProperty='common'
      transitionDuration='normal'
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
        <Flex gap={2} alignItems='center'>
          <RawText color='gray.500'>
            <FaGasPump />
          </RawText>
          {
            // We cannot infer gas fees for 1inch swapper before an amount is entered
            !isAmountEntered && quoteData.swapperName === SwapperName.OneInch ? (
              translate('trade.unknownGas')
            ) : (
              <Amount.Fiat value={networkFeeFiatPrecision} />
            )
          }
        </Flex>
      </Flex>
      <Flex justifyContent='space-between' alignItems='center'>
        <Flex gap={2} alignItems='center'>
          <SwapperIcon swapperName={quoteData.swapperName} />
          <RawText>{quoteData.swapperName}</RawText>
        </Flex>
        <Amount.Crypto
          value={hasAmountWithPositiveReceive ? totalReceiveAmountCryptoPrecision : '0'}
          symbol={buyAsset?.symbol ?? ''}
          color={isBest ? greenColor : 'inherit'}
        />
      </Flex>
    </Flex>
  ) : null
}

export const TradeQuote: React.FC<TradeQuoteLoadedProps> = props => {
  return props.quoteData.isLoading ? <TradeQuoteLoading /> : <TradeQuoteLoaded {...props} />
}
