import { Flex, Skeleton, SkeletonCircle, Stack, Tag, useColorModeValue } from '@chakra-ui/react'
import { ethAssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { FaGasPump } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { LazyLoadAvatar } from 'components/LazyLoadAvatar'
import { RawText } from 'components/Text'
import { useIsTradingActive } from 'components/Trade/hooks/useIsTradingActive'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import type { SwapperWithQuoteMetadata } from 'lib/swapper/api'
import { SwapperName } from 'lib/swapper/api'
import { assertUnreachable } from 'lib/utils'
import { selectFeeAssetByChainId, selectFeeAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import { selectFeeAssetFiatRate } from 'state/zustand/swapperStore/amountSelectors'
import { selectAmount, selectBuyAsset, selectSellAsset } from 'state/zustand/swapperStore/selectors'
import { useSwapperStore } from 'state/zustand/swapperStore/useSwapperStore'

import ZrxIcon from './0x-icon.png'
import OneInchIcon from './1inch-icon.png'
import CowIcon from './cow-icon.png'
import LiFiIcon from './lifi-icon.png'
import OsmosisIcon from './osmosis-icon.png'
import THORChainIcon from './thorchain-icon.png'

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
  isActive?: boolean
  isBest?: boolean
  quoteDifference: string
  swapperWithMetadata: SwapperWithQuoteMetadata
  totalReceiveAmountCryptoPrecision: string | undefined
}

export const TradeQuoteLoaded: React.FC<TradeQuoteLoadedProps> = ({
  isActive,
  isBest,
  quoteDifference,
  swapperWithMetadata,
  totalReceiveAmountCryptoPrecision,
}) => {
  const translate = useTranslate()
  const borderColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.100')
  const greenColor = useColorModeValue('green.500', 'green.200')
  const redColor = useColorModeValue('red.500', 'red.200')
  const hoverColor = useColorModeValue('blackAlpha.300', 'whiteAlpha.300')
  const focusColor = useColorModeValue('blackAlpha.400', 'whiteAlpha.400')

  const { isTradingActive } = useIsTradingActive()

  const feeAssetFiatRate = useSwapperStore(selectFeeAssetFiatRate)
  const buyAsset = useSwapperStore(selectBuyAsset)
  const sellAsset = useSwapperStore(selectSellAsset)
  const sellFeeAsset = useAppSelector(state =>
    selectFeeAssetById(state, sellAsset?.assetId ?? ethAssetId),
  )
  const amount = useSwapperStore(selectAmount)
  const updatePreferredSwapper = useSwapperStore(state => state.updatePreferredSwapper)
  const updateFees = useSwapperStore(state => state.updateFees)
  const updateTradeAmountsFromQuote = useSwapperStore(state => state.updateTradeAmountsFromQuote)

  const handleSwapperSelection = useCallback(() => {
    updatePreferredSwapper(swapperWithMetadata.swapper.name)
    if (!sellFeeAsset) throw new Error(`Asset not found for AssetId ${sellAsset?.assetId}`)
    updateFees(sellFeeAsset)
    updateTradeAmountsFromQuote()
  }, [
    updatePreferredSwapper,
    swapperWithMetadata.swapper.name,
    sellFeeAsset,
    sellAsset?.assetId,
    updateFees,
    updateTradeAmountsFromQuote,
  ])

  const { quote, inputOutputRatio } = swapperWithMetadata

  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, sellAsset?.chainId ?? ''))
  if (!feeAsset)
    throw new Error(`TradeQuoteLoaded: no fee asset found for chainId ${sellAsset?.chainId}!`)

  const networkFeeFiat = feeAssetFiatRate
    ? bnOrZero(
        fromBaseUnit(quote.steps[0].feeData.networkFeeCryptoBaseUnit, feeAsset.precision),
      ).times(feeAssetFiatRate)
    : undefined

  const protocol = swapperWithMetadata.swapper.name
  const isAmountEntered = bnOrZero(amount).gt(0)
  const hasNegativeRatio =
    inputOutputRatio !== undefined && isAmountEntered && inputOutputRatio <= 0

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

  const protocolIcon = useMemo(() => {
    const swapperName = swapperWithMetadata.swapper.name
    switch (swapperName) {
      case SwapperName.Osmosis:
        return OsmosisIcon
      case SwapperName.LIFI:
        return LiFiIcon
      case SwapperName.CowSwap:
        return CowIcon
      case SwapperName.Zrx:
        return ZrxIcon
      case SwapperName.Thorchain:
        return THORChainIcon
      case SwapperName.OneInch:
        return OneInchIcon
      case SwapperName.Test:
        return ''
      default:
        assertUnreachable(swapperName)
    }
  }, [swapperWithMetadata])

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
      onClick={handleSwapperSelection}
      transitionProperty='common'
      transitionDuration='normal'
    >
      <Flex justifyContent='space-between' alignItems='center'>
        <Flex gap={2}>
          {tag}
          {!isBest && hasAmountWithPositiveReceive && (
            <Tag size='sm' colorScheme='red' variant='xs-subtle'>
              <Amount.Percent value={quoteDifference} />
            </Tag>
          )}
        </Flex>
        <Flex gap={2} alignItems='center'>
          <RawText color='gray.500'>
            <FaGasPump />
          </RawText>
          {
            // We cannot infer gas fees for 1inch swapper before an amount is entered
            !isAmountEntered && protocol === SwapperName.OneInch ? (
              translate('trade.unknownGas')
            ) : (
              <Amount.Fiat value={bnOrZero(networkFeeFiat).toString()} />
            )
          }
        </Flex>
      </Flex>
      <Flex justifyContent='space-between' alignItems='center'>
        <Flex gap={2} alignItems='center'>
          <LazyLoadAvatar size='xs' src={protocolIcon} />
          <RawText>{protocol}</RawText>
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
type TradeQuoteProps = {
  isLoading?: boolean
} & TradeQuoteLoadedProps

export const TradeQuote: React.FC<TradeQuoteProps> = ({ isLoading, ...restOfTradeQuote }) => {
  return isLoading ? <TradeQuoteLoading /> : <TradeQuoteLoaded {...restOfTradeQuote} />
}
