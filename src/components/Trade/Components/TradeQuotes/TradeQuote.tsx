import {
  Avatar,
  Flex,
  Skeleton,
  SkeletonCircle,
  Stack,
  Tag,
  useColorModeValue,
} from '@chakra-ui/react'
import type { SwapperWithQuoteMetadata } from '@shapeshiftoss/swapper'
import { FaGasPump } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { RawText } from 'components/Text'
import { useSwapperState } from 'components/Trade/SwapperProvider/swapperProvider'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { selectAssetById, selectFeeAssetByChainId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

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
  quoteDifference?: string
  protocolIcon?: string
  onClick: (activeSwapperWithMetadata: SwapperWithQuoteMetadata) => void
  swapperWithMetadata: SwapperWithQuoteMetadata
}

export const TradeQuoteLoaded: React.FC<TradeQuoteLoadedProps> = ({
  isActive,
  isBest,
  quoteDifference,
  protocolIcon,
  onClick: handleSelectSwapper,
  swapperWithMetadata,
}) => {
  const translate = useTranslate()
  const borderColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.100')
  const greenColor = useColorModeValue('green.500', 'green.200')
  const hoverColor = useColorModeValue('blackAlpha.300', 'whiteAlpha.300')
  const focusColor = useColorModeValue('blackAlpha.400', 'whiteAlpha.400')

  const {
    state: { feeAssetFiatRate, buyAssetFiatRate, buyTradeAsset, sellTradeAsset },
  } = useSwapperState()

  const { quote } = swapperWithMetadata
  const buyAssetId = buyTradeAsset?.asset?.assetId
  const buyAsset = useAppSelector(state => selectAssetById(state, buyAssetId ?? ''))
  const buyAmountCryptoPrecision = fromBaseUnit(
    quote.buyAmountCryptoBaseUnit,
    quote.buyAsset.precision,
  )

  const buyAssetTradeFeeCryptoPrecision = buyAssetFiatRate
    ? bnOrZero(quote.feeData.buyAssetTradeFeeUsd).div(buyAssetFiatRate)
    : undefined

  const totalReceiveAmountCryptoPrecision = buyAssetTradeFeeCryptoPrecision
    ? bnOrZero(buyAmountCryptoPrecision).minus(buyAssetTradeFeeCryptoPrecision).toString()
    : undefined

  const feeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, sellTradeAsset?.asset?.chainId ?? ''),
  )
  if (!feeAsset)
    throw new Error(
      `TradeQuoteLoaded: no fee asset found for chainId ${sellTradeAsset?.asset?.chainId}!`,
    )

  const networkFeeFiat = feeAssetFiatRate
    ? bnOrZero(fromBaseUnit(quote.feeData.networkFeeCryptoBaseUnit, feeAsset.precision))
        .times(feeAssetFiatRate)
        .toString()
    : undefined

  const protocol = swapperWithMetadata.swapper.name
  return networkFeeFiat && totalReceiveAmountCryptoPrecision ? (
    <Flex
      borderWidth={1}
      cursor='pointer'
      borderColor={isActive ? greenColor : borderColor}
      _hover={{ borderColor: isActive ? greenColor : hoverColor }}
      _active={{ borderColor: isActive ? greenColor : focusColor }}
      borderRadius='xl'
      flexDir='column'
      gap={2}
      width='full'
      px={4}
      py={2}
      fontSize='sm'
      onClick={() => handleSelectSwapper(swapperWithMetadata)}
      transitionProperty='common'
      transitionDuration='normal'
    >
      <Flex justifyContent='space-between' alignItems='center'>
        <Flex gap={2}>
          {isBest ? (
            <Tag size='sm' colorScheme='green'>
              {translate('common.best')}
            </Tag>
          ) : (
            <Tag size='sm'>{translate('common.alternative')}</Tag>
          )}
          {!isBest && (
            <Tag size='sm' colorScheme='red' variant='xs-subtle'>
              <Amount.Percent value={quoteDifference ?? '0'} />
            </Tag>
          )}
        </Flex>
        <Flex gap={2} alignItems='center'>
          <RawText color='gray.500'>
            <FaGasPump />
          </RawText>
          <Amount.Fiat value={networkFeeFiat} />
        </Flex>
      </Flex>
      <Flex justifyContent='space-between' alignItems='center'>
        <Flex gap={2} alignItems='center'>
          <Avatar size='xs' src={protocolIcon} />
          <RawText>{protocol}</RawText>
        </Flex>
        <Amount.Crypto
          value={totalReceiveAmountCryptoPrecision}
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
