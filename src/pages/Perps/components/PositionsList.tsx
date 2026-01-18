import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  IconButton,
  Skeleton,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { memo, useCallback, useMemo, useState } from 'react'
import { FaTimes } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { ParsedPosition } from '@/lib/hyperliquid/types'
import { PositionSide } from '@/lib/hyperliquid/types'
import { formatLeverage, formatPrice, formatSize } from '@/lib/hyperliquid/utils'

type PositionsListProps = {
  positions: ParsedPosition[]
  isLoading: boolean
  error: string | undefined
  onClosePosition?: (coin: string) => Promise<void>
  onSelectPosition?: (position: ParsedPosition) => void
  szDecimals?: number
  priceDecimals?: number
}

type PositionRowProps = {
  position: ParsedPosition
  szDecimals: number
  priceDecimals: number
  isClosing: boolean
  onClose?: () => Promise<void>
  onSelect?: () => void
  longColor: string
  shortColor: string
  pnlPositiveColor: string
  pnlNegativeColor: string
}

const closeIcon = <FaTimes />

const PositionRow = memo(
  ({
    position,
    szDecimals,
    priceDecimals,
    isClosing,
    onClose,
    onSelect,
    longColor,
    shortColor,
    pnlPositiveColor,
    pnlNegativeColor,
  }: PositionRowProps) => {
    const translate = useTranslate()
    const hoverBg = useColorModeValue('gray.50', 'whiteAlpha.50')
    const liquidationColor = useColorModeValue('orange.500', 'orange.300')

    const isLong = position.side === PositionSide.Long
    const sideColor = isLong ? longColor : shortColor
    const sideLabel = isLong
      ? translate('perps.positions.long')
      : translate('perps.positions.short')

    const unrealizedPnl = useMemo(() => bnOrZero(position.unrealizedPnl), [position.unrealizedPnl])
    const unrealizedPnlPercent = useMemo(
      () => bnOrZero(position.unrealizedPnlPercent).times(100),
      [position.unrealizedPnlPercent],
    )
    const isPnlPositive = unrealizedPnl.gte(0)
    const pnlColor = isPnlPositive ? pnlPositiveColor : pnlNegativeColor

    const formattedSize = useMemo(
      () => formatSize(position.size, szDecimals),
      [position.size, szDecimals],
    )

    const formattedEntryPrice = useMemo(
      () => formatPrice(position.entryPrice, priceDecimals),
      [position.entryPrice, priceDecimals],
    )

    const formattedMarkPrice = useMemo(
      () => formatPrice(position.markPrice, priceDecimals),
      [position.markPrice, priceDecimals],
    )

    const formattedLiquidationPrice = useMemo(
      () =>
        position.liquidationPrice ? formatPrice(position.liquidationPrice, priceDecimals) : '-',
      [position.liquidationPrice, priceDecimals],
    )

    const formattedPnlPercent = useMemo(() => {
      const sign = isPnlPositive ? '+' : ''
      return `${sign}${unrealizedPnlPercent.toFixed(2)}%`
    }, [isPnlPositive, unrealizedPnlPercent])

    const handleClick = useCallback(() => {
      onSelect?.()
    }, [onSelect])

    const handleClose = useCallback(
      async (e: React.MouseEvent) => {
        e.stopPropagation()
        await onClose?.()
      },
      [onClose],
    )

    return (
      <Tr
        _hover={{ bg: hoverBg }}
        cursor={onSelect ? 'pointer' : 'default'}
        onClick={handleClick}
        transition='background 0.1s'
      >
        <Td py={2} px={3}>
          <HStack spacing={2}>
            <Text fontSize='sm' fontWeight='semibold'>
              {position.coin}
            </Text>
            <Badge
              colorScheme={isLong ? 'green' : 'red'}
              fontSize='xs'
              textTransform='uppercase'
            >
              {sideLabel}
            </Badge>
          </HStack>
        </Td>
        <Td py={2} px={3} isNumeric>
          <VStack spacing={0} align='flex-end'>
            <Text fontSize='sm' fontFamily='mono'>
              {formattedSize}
            </Text>
            <Text fontSize='xs' color='text.subtle'>
              {formatLeverage(position.leverage)}
            </Text>
          </VStack>
        </Td>
        <Td py={2} px={3} isNumeric>
          <Text fontSize='sm' fontFamily='mono'>
            ${formattedEntryPrice}
          </Text>
        </Td>
        <Td py={2} px={3} isNumeric>
          <Text fontSize='sm' fontFamily='mono'>
            ${formattedMarkPrice}
          </Text>
        </Td>
        <Td py={2} px={3} isNumeric>
          <Text fontSize='sm' fontFamily='mono' color={liquidationColor}>
            {position.liquidationPrice ? `$${formattedLiquidationPrice}` : '-'}
          </Text>
        </Td>
        <Td py={2} px={3} isNumeric>
          <VStack spacing={0} align='flex-end'>
            <HStack spacing={1}>
              <Amount.Fiat
                value={position.unrealizedPnl}
                fontSize='sm'
                fontFamily='mono'
                fontWeight='medium'
                color={pnlColor}
                prefix={isPnlPositive ? '+' : ''}
              />
            </HStack>
            <Text fontSize='xs' color={pnlColor}>
              {formattedPnlPercent}
            </Text>
          </VStack>
        </Td>
        <Td py={2} px={3} isNumeric>
          <Amount.Fiat value={position.marginUsed} fontSize='sm' fontFamily='mono' />
        </Td>
        <Td py={2} px={3}>
          {onClose && (
            <Tooltip label={translate('perps.positions.closePosition')}>
              <IconButton
                aria-label={translate('perps.positions.closePosition')}
                icon={isClosing ? <Spinner size='xs' /> : closeIcon}
                size='sm'
                variant='ghost'
                colorScheme='red'
                onClick={handleClose}
                isDisabled={isClosing}
              />
            </Tooltip>
          )}
        </Td>
      </Tr>
    )
  },
)

const PositionsTableHeader = memo(() => {
  const translate = useTranslate()
  const headerColor = useColorModeValue('gray.500', 'gray.400')

  return (
    <Thead>
      <Tr>
        <Th
          color={headerColor}
          fontSize='xs'
          fontWeight='semibold'
          textTransform='uppercase'
          borderColor='border.base'
          px={3}
        >
          {translate('perps.positions.market')}
        </Th>
        <Th
          color={headerColor}
          fontSize='xs'
          fontWeight='semibold'
          textTransform='uppercase'
          borderColor='border.base'
          px={3}
          isNumeric
        >
          {translate('perps.positions.size')}
        </Th>
        <Th
          color={headerColor}
          fontSize='xs'
          fontWeight='semibold'
          textTransform='uppercase'
          borderColor='border.base'
          px={3}
          isNumeric
        >
          {translate('perps.positions.entryPrice')}
        </Th>
        <Th
          color={headerColor}
          fontSize='xs'
          fontWeight='semibold'
          textTransform='uppercase'
          borderColor='border.base'
          px={3}
          isNumeric
        >
          {translate('perps.positions.markPrice')}
        </Th>
        <Th
          color={headerColor}
          fontSize='xs'
          fontWeight='semibold'
          textTransform='uppercase'
          borderColor='border.base'
          px={3}
          isNumeric
        >
          {translate('perps.positions.liqPrice')}
        </Th>
        <Th
          color={headerColor}
          fontSize='xs'
          fontWeight='semibold'
          textTransform='uppercase'
          borderColor='border.base'
          px={3}
          isNumeric
        >
          {translate('perps.positions.pnl')}
        </Th>
        <Th
          color={headerColor}
          fontSize='xs'
          fontWeight='semibold'
          textTransform='uppercase'
          borderColor='border.base'
          px={3}
          isNumeric
        >
          {translate('perps.positions.margin')}
        </Th>
        <Th borderColor='border.base' px={3} width='50px' />
      </Tr>
    </Thead>
  )
})

const PositionsSkeleton = memo(() => {
  const rows = useMemo(() => [1, 2, 3], [])

  return (
    <Tbody>
      {rows.map(i => (
        <Tr key={i}>
          <Td py={2} px={3}>
            <Skeleton height='20px' width='80px' />
          </Td>
          <Td py={2} px={3} isNumeric>
            <Skeleton height='20px' width='60px' ml='auto' />
          </Td>
          <Td py={2} px={3} isNumeric>
            <Skeleton height='20px' width='70px' ml='auto' />
          </Td>
          <Td py={2} px={3} isNumeric>
            <Skeleton height='20px' width='70px' ml='auto' />
          </Td>
          <Td py={2} px={3} isNumeric>
            <Skeleton height='20px' width='70px' ml='auto' />
          </Td>
          <Td py={2} px={3} isNumeric>
            <Skeleton height='20px' width='80px' ml='auto' />
          </Td>
          <Td py={2} px={3} isNumeric>
            <Skeleton height='20px' width='60px' ml='auto' />
          </Td>
          <Td py={2} px={3}>
            <Skeleton height='24px' width='24px' borderRadius='md' />
          </Td>
        </Tr>
      ))}
    </Tbody>
  )
})

const EmptyPositions = memo(() => {
  const translate = useTranslate()

  return (
    <Flex justify='center' align='center' py={8} color='text.subtle'>
      <Text fontSize='sm'>{translate('perps.positions.noPositions')}</Text>
    </Flex>
  )
})

const PositionsError = memo(({ error }: { error: string }) => {
  const translate = useTranslate()
  const errorColor = useColorModeValue('red.500', 'red.400')

  return (
    <Flex justify='center' align='center' py={8} color={errorColor} direction='column' gap={2}>
      <Text fontSize='sm' fontWeight='medium'>
        {translate('perps.positions.error')}
      </Text>
      <Text fontSize='xs' color='text.subtle'>
        {error}
      </Text>
    </Flex>
  )
})

type PositionsSummaryProps = {
  positions: ParsedPosition[]
  pnlPositiveColor: string
  pnlNegativeColor: string
}

const PositionsSummary = memo(
  ({ positions, pnlPositiveColor, pnlNegativeColor }: PositionsSummaryProps) => {
    const translate = useTranslate()
    const bgColor = useColorModeValue('gray.50', 'whiteAlpha.50')

    const totalUnrealizedPnl = useMemo(() => {
      return positions.reduce((sum, pos) => sum.plus(pos.unrealizedPnl), bnOrZero(0)).toString()
    }, [positions])

    const totalMarginUsed = useMemo(() => {
      return positions.reduce((sum, pos) => sum.plus(pos.marginUsed), bnOrZero(0)).toString()
    }, [positions])

    const isPnlPositive = bnOrZero(totalUnrealizedPnl).gte(0)
    const pnlColor = isPnlPositive ? pnlPositiveColor : pnlNegativeColor

    return (
      <Box bg={bgColor} borderRadius='lg' p={3}>
        <HStack justify='space-between' flexWrap='wrap' gap={4}>
          <HStack spacing={6}>
            <VStack spacing={0} align='flex-start'>
              <Text fontSize='xs' color='text.subtle'>
                {translate('perps.positions.totalPositions')}
              </Text>
              <Text fontSize='sm' fontWeight='semibold'>
                {positions.length}
              </Text>
            </VStack>
            <VStack spacing={0} align='flex-start'>
              <Text fontSize='xs' color='text.subtle'>
                {translate('perps.positions.totalMargin')}
              </Text>
              <Amount.Fiat value={totalMarginUsed} fontSize='sm' fontWeight='semibold' />
            </VStack>
          </HStack>
          <VStack spacing={0} align='flex-end'>
            <Text fontSize='xs' color='text.subtle'>
              {translate('perps.positions.totalPnl')}
            </Text>
            <Amount.Fiat
              value={totalUnrealizedPnl}
              fontSize='sm'
              fontWeight='bold'
              color={pnlColor}
              prefix={isPnlPositive ? '+' : ''}
            />
          </VStack>
        </HStack>
      </Box>
    )
  },
)

export const PositionsList = memo(
  ({
    positions,
    isLoading,
    error,
    onClosePosition,
    onSelectPosition,
    szDecimals = 4,
    priceDecimals = 2,
  }: PositionsListProps) => {
    const translate = useTranslate()
    const borderColor = useColorModeValue('gray.200', 'gray.700')
    const bgColor = useColorModeValue('white', 'gray.800')
    const longColor = useColorModeValue('green.500', 'green.400')
    const shortColor = useColorModeValue('red.500', 'red.400')
    const pnlPositiveColor = useColorModeValue('green.500', 'green.400')
    const pnlNegativeColor = useColorModeValue('red.500', 'red.400')
    const headerBgColor = useColorModeValue('gray.50', 'whiteAlpha.50')

    const [closingPosition, setClosingPosition] = useState<string | null>(null)

    const handleClosePosition = useCallback(
      async (coin: string) => {
        if (!onClosePosition) return

        setClosingPosition(coin)
        try {
          await onClosePosition(coin)
        } finally {
          setClosingPosition(null)
        }
      },
      [onClosePosition],
    )

    if (error) {
      return (
        <Box
          borderRadius='lg'
          border='1px solid'
          borderColor={borderColor}
          bg={bgColor}
          overflow='hidden'
        >
          <PositionsError error={error} />
        </Box>
      )
    }

    if (isLoading && positions.length === 0) {
      return (
        <Box
          borderRadius='lg'
          border='1px solid'
          borderColor={borderColor}
          bg={bgColor}
          overflow='hidden'
        >
          <Box p={3} borderBottomWidth={1} borderColor={borderColor} bg={headerBgColor}>
            <Text fontSize='sm' fontWeight='semibold'>
              {translate('perps.positions.title')}
            </Text>
          </Box>
          <Box overflowX='auto'>
            <Table size='sm'>
              <PositionsTableHeader />
              <PositionsSkeleton />
            </Table>
          </Box>
        </Box>
      )
    }

    if (positions.length === 0) {
      return (
        <Box
          borderRadius='lg'
          border='1px solid'
          borderColor={borderColor}
          bg={bgColor}
          overflow='hidden'
        >
          <Box p={3} borderBottomWidth={1} borderColor={borderColor} bg={headerBgColor}>
            <Text fontSize='sm' fontWeight='semibold'>
              {translate('perps.positions.title')}
            </Text>
          </Box>
          <EmptyPositions />
        </Box>
      )
    }

    return (
      <Box
        borderRadius='lg'
        border='1px solid'
        borderColor={borderColor}
        bg={bgColor}
        overflow='hidden'
      >
        <Box p={3} borderBottomWidth={1} borderColor={borderColor} bg={headerBgColor}>
          <Text fontSize='sm' fontWeight='semibold'>
            {translate('perps.positions.title')}
          </Text>
        </Box>

        <PositionsSummary
          positions={positions}
          pnlPositiveColor={pnlPositiveColor}
          pnlNegativeColor={pnlNegativeColor}
        />

        <Box overflowX='auto'>
          <Table size='sm'>
            <PositionsTableHeader />
            <Tbody>
              {positions.map(position => (
                <PositionRow
                  key={`${position.coin}-${position.side}`}
                  position={position}
                  szDecimals={szDecimals}
                  priceDecimals={priceDecimals}
                  isClosing={closingPosition === position.coin}
                  onClose={
                    onClosePosition ? () => handleClosePosition(position.coin) : undefined
                  }
                  onSelect={onSelectPosition ? () => onSelectPosition(position) : undefined}
                  longColor={longColor}
                  shortColor={shortColor}
                  pnlPositiveColor={pnlPositiveColor}
                  pnlNegativeColor={pnlNegativeColor}
                />
              ))}
            </Tbody>
          </Table>
        </Box>
      </Box>
    )
  },
)
