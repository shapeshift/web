import { Box, Flex, HStack, Skeleton, Text, useColorModeValue, VStack } from '@chakra-ui/react'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { bnOrZero } from '@/lib/bignumber/bignumber'
import { HYPERLIQUID_DEFAULT_ORDERBOOK_LEVELS } from '@/lib/hyperliquid/constants'
import type { ParsedOrderbook, ParsedOrderbookLevel } from '@/lib/hyperliquid/types'
import { formatPrice, formatSize } from '@/lib/hyperliquid/utils'

type OrderbookProps = {
  orderbook: ParsedOrderbook | null
  isLoading: boolean
  error: string | undefined
  szDecimals?: number
  priceDecimals?: number
  maxLevels?: number
  onPriceClick?: (price: string) => void
  onSizeClick?: (size: string) => void
}

type OrderbookRowProps = {
  level: ParsedOrderbookLevel
  side: 'bid' | 'ask'
  szDecimals: number
  priceDecimals: number
  depthColor: string
  priceColor: string
  onPriceClick?: (price: string) => void
  onSizeClick?: (size: string) => void
}

const hoverBg = { bg: 'background.surface.raised.hover' }

const OrderbookRow = memo(
  ({
    level,
    side,
    szDecimals,
    priceDecimals,
    depthColor,
    priceColor,
    onPriceClick,
    onSizeClick,
  }: OrderbookRowProps) => {
    const handlePriceClick = useCallback(() => {
      onPriceClick?.(level.price)
    }, [level.price, onPriceClick])

    const handleSizeClick = useCallback(() => {
      onSizeClick?.(level.size)
    }, [level.size, onSizeClick])

    const depthBarStyle = useMemo(
      () => ({
        position: 'absolute' as const,
        top: 0,
        bottom: 0,
        [side === 'bid' ? 'right' : 'left']: 0,
        width: `${Math.min(level.percentage, 100)}%`,
        backgroundColor: depthColor,
        opacity: 0.2,
        transition: 'width 0.15s ease-out',
        pointerEvents: 'none' as const,
      }),
      [side, level.percentage, depthColor],
    )

    const formattedPrice = useMemo(
      () => formatPrice(level.price, priceDecimals),
      [level.price, priceDecimals],
    )

    const formattedSize = useMemo(
      () => formatSize(level.size, szDecimals),
      [level.size, szDecimals],
    )

    const formattedTotal = useMemo(
      () => formatSize(level.total, szDecimals),
      [level.total, szDecimals],
    )

    return (
      <Box position='relative' _hover={hoverBg} cursor='pointer' transition='all 0.1s'>
        <Box style={depthBarStyle} />
        <HStack px={2} py={0.5} spacing={0} justify='space-between' position='relative' zIndex={1}>
          <Text
            flex={1}
            fontSize='xs'
            fontFamily='mono'
            color={priceColor}
            fontWeight='medium'
            onClick={handlePriceClick}
            _hover={{ textDecoration: 'underline' }}
          >
            {formattedPrice}
          </Text>
          <Text
            flex={1}
            fontSize='xs'
            fontFamily='mono'
            textAlign='right'
            color='text.base'
            onClick={handleSizeClick}
            _hover={{ textDecoration: 'underline' }}
          >
            {formattedSize}
          </Text>
          <Text flex={1} fontSize='xs' fontFamily='mono' textAlign='right' color='text.subtle'>
            {formattedTotal}
          </Text>
        </HStack>
      </Box>
    )
  },
)

const OrderbookHeader = memo(() => {
  const translate = useTranslate()
  const headerColor = useColorModeValue('gray.500', 'gray.400')

  return (
    <HStack
      px={2}
      py={1}
      spacing={0}
      justify='space-between'
      borderBottomWidth={1}
      borderColor='border.base'
    >
      <Text
        flex={1}
        fontSize='xs'
        fontWeight='semibold'
        color={headerColor}
        textTransform='uppercase'
      >
        {translate('perps.orderbook.price')}
      </Text>
      <Text
        flex={1}
        fontSize='xs'
        fontWeight='semibold'
        color={headerColor}
        textAlign='right'
        textTransform='uppercase'
      >
        {translate('perps.orderbook.size')}
      </Text>
      <Text
        flex={1}
        fontSize='xs'
        fontWeight='semibold'
        color={headerColor}
        textAlign='right'
        textTransform='uppercase'
      >
        {translate('perps.orderbook.total')}
      </Text>
    </HStack>
  )
})

type SpreadRowProps = {
  spread: string
  spreadPercent: string
  midPrice: string
  priceDecimals: number
}

const SpreadRow = memo(({ spread, spreadPercent, midPrice, priceDecimals }: SpreadRowProps) => {
  const translate = useTranslate()
  const midPriceColor = useColorModeValue('blue.600', 'blue.300')
  const spreadLabelColor = useColorModeValue('gray.500', 'gray.400')
  const bgColor = useColorModeValue('gray.50', 'whiteAlpha.50')

  const formattedMidPrice = useMemo(
    () => formatPrice(midPrice, priceDecimals),
    [midPrice, priceDecimals],
  )

  const formattedSpread = useMemo(() => {
    const spreadVal = bnOrZero(spread)
    return spreadVal.lt(1) ? spreadVal.toFixed(6) : spreadVal.toFixed(2)
  }, [spread])

  const formattedSpreadPercent = useMemo(() => {
    return bnOrZero(spreadPercent).toFixed(3)
  }, [spreadPercent])

  return (
    <Box
      py={1.5}
      px={2}
      bg={bgColor}
      borderTopWidth={1}
      borderBottomWidth={1}
      borderColor='border.base'
    >
      <Flex justify='space-between' align='center'>
        <HStack spacing={2}>
          <Text fontSize='sm' fontWeight='bold' fontFamily='mono' color={midPriceColor}>
            {formattedMidPrice}
          </Text>
        </HStack>
        <HStack spacing={1}>
          <Text fontSize='xs' color={spreadLabelColor}>
            {translate('perps.orderbook.spread')}:
          </Text>
          <Text fontSize='xs' fontFamily='mono' color='text.subtle'>
            {formattedSpread} ({formattedSpreadPercent}%)
          </Text>
        </HStack>
      </Flex>
    </Box>
  )
})

const OrderbookSkeleton = memo(({ levels }: { levels: number }) => {
  const rows = useMemo(() => Array.from({ length: levels }, (_, i) => i), [levels])

  return (
    <VStack spacing={0.5} align='stretch' px={2} py={1}>
      {rows.map(i => (
        <Skeleton key={i} height='20px' />
      ))}
    </VStack>
  )
})

const EmptyOrderbook = memo(() => {
  const translate = useTranslate()

  return (
    <Flex justify='center' align='center' py={8} color='text.subtle'>
      <Text fontSize='sm'>{translate('perps.orderbook.noData')}</Text>
    </Flex>
  )
})

const OrderbookError = memo(({ error }: { error: string }) => {
  const translate = useTranslate()
  const errorColor = useColorModeValue('red.500', 'red.400')

  return (
    <Flex justify='center' align='center' py={8} color={errorColor} direction='column' gap={2}>
      <Text fontSize='sm' fontWeight='medium'>
        {translate('perps.orderbook.error')}
      </Text>
      <Text fontSize='xs' color='text.subtle'>
        {error}
      </Text>
    </Flex>
  )
})

export const Orderbook = memo(
  ({
    orderbook,
    isLoading,
    error,
    szDecimals = 4,
    priceDecimals = 2,
    maxLevels = HYPERLIQUID_DEFAULT_ORDERBOOK_LEVELS,
    onPriceClick,
    onSizeClick,
  }: OrderbookProps) => {
    const borderColor = useColorModeValue('gray.200', 'gray.700')
    const bidColor = useColorModeValue('green.500', 'green.400')
    const askColor = useColorModeValue('red.500', 'red.400')
    const bidDepthColor = useColorModeValue('green.500', 'green.500')
    const askDepthColor = useColorModeValue('red.500', 'red.500')

    const visibleAsks = useMemo(() => {
      if (!orderbook?.asks) return []
      return orderbook.asks.slice(0, maxLevels).reverse()
    }, [orderbook?.asks, maxLevels])

    const visibleBids = useMemo(() => {
      if (!orderbook?.bids) return []
      return orderbook.bids.slice(0, maxLevels)
    }, [orderbook?.bids, maxLevels])

    if (error) {
      return (
        <Box borderRadius='lg' border='1px solid' borderColor={borderColor} overflow='hidden'>
          <OrderbookError error={error} />
        </Box>
      )
    }

    if (isLoading || !orderbook) {
      return (
        <Box borderRadius='lg' border='1px solid' borderColor={borderColor} overflow='hidden'>
          <OrderbookHeader />
          <OrderbookSkeleton levels={maxLevels} />
          <Box py={2} borderTopWidth={1} borderBottomWidth={1} borderColor='border.base'>
            <Skeleton height='24px' mx={2} />
          </Box>
          <OrderbookSkeleton levels={maxLevels} />
        </Box>
      )
    }

    const hasData = visibleAsks.length > 0 || visibleBids.length > 0

    if (!hasData) {
      return (
        <Box borderRadius='lg' border='1px solid' borderColor={borderColor} overflow='hidden'>
          <OrderbookHeader />
          <EmptyOrderbook />
        </Box>
      )
    }

    return (
      <Box borderRadius='lg' border='1px solid' borderColor={borderColor} overflow='hidden'>
        <OrderbookHeader />

        <VStack spacing={0} align='stretch'>
          {visibleAsks.map(level => (
            <OrderbookRow
              key={`ask-${level.price}`}
              level={level}
              side='ask'
              szDecimals={szDecimals}
              priceDecimals={priceDecimals}
              depthColor={askDepthColor}
              priceColor={askColor}
              onPriceClick={onPriceClick}
              onSizeClick={onSizeClick}
            />
          ))}
        </VStack>

        <SpreadRow
          spread={orderbook.spread}
          spreadPercent={orderbook.spreadPercent}
          midPrice={orderbook.midPrice}
          priceDecimals={priceDecimals}
        />

        <VStack spacing={0} align='stretch'>
          {visibleBids.map(level => (
            <OrderbookRow
              key={`bid-${level.price}`}
              level={level}
              side='bid'
              szDecimals={szDecimals}
              priceDecimals={priceDecimals}
              depthColor={bidDepthColor}
              priceColor={bidColor}
              onPriceClick={onPriceClick}
              onSizeClick={onSizeClick}
            />
          ))}
        </VStack>
      </Box>
    )
  },
)
