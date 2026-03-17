import { Box, Circle, Flex, Icon, Text } from '@chakra-ui/react'
import { memo, useMemo } from 'react'
import { TbSkull } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { useChainflipLtvThresholds } from '@/pages/ChainflipLending/hooks/useChainflipLtvThresholds'

type LtvGaugeProps = {
  currentLtv: number
  projectedLtv?: number
}

const GAUGE_HEIGHT = '10px'
const THUMB_SIZE = '20px'

const DEFAULT_HARD_LIQUIDATION_LTV = 0.93

// Risky threshold sits between soft and hard liquidation - use topup or midpoint
const DEFAULT_RISKY_LTV = 0.8

const ltvToPercent = (ltv: number): number => Math.min(Math.max(ltv * 100, 0), 100)

const getStatusColor = (ltv: number, riskyLtv: number, hardLiquidationLtv: number): string => {
  if (ltv >= hardLiquidationLtv) return 'red.500'
  if (ltv >= riskyLtv) return 'yellow.500'
  return 'green.500'
}

type LegendItem = {
  labelKey: string
  color: string
}

const legendItems: LegendItem[] = [
  { labelKey: 'chainflipLending.ltv.safe', color: 'green.500' },
  { labelKey: 'chainflipLending.ltv.risky', color: 'yellow.500' },
  { labelKey: 'chainflipLending.ltv.liquidation', color: 'red.500' },
]

export const LtvGauge = memo(({ currentLtv, projectedLtv }: LtvGaugeProps) => {
  const translate = useTranslate()
  const { thresholds } = useChainflipLtvThresholds()

  // Zone boundaries: safe (0 -> risky), risky (risky -> hard liq), liquidation (hard liq -> 100%)
  const riskyLtv = thresholds?.target ?? DEFAULT_RISKY_LTV
  const hardLiquidationLtv = thresholds?.hardLiquidation ?? DEFAULT_HARD_LIQUIDATION_LTV

  const statusColor = useMemo(
    () => getStatusColor(currentLtv, riskyLtv, hardLiquidationLtv),
    [currentLtv, riskyLtv, hardLiquidationLtv],
  )

  const thumbPosition = useMemo(() => ltvToPercent(currentLtv), [currentLtv])

  const projectedThumbPosition = useMemo(
    () => (projectedLtv !== undefined ? ltvToPercent(projectedLtv) : undefined),
    [projectedLtv],
  )

  // Segment widths as percentages
  const safeWidth = useMemo(() => riskyLtv * 100, [riskyLtv])
  const riskyWidth = useMemo(
    () => (hardLiquidationLtv - riskyLtv) * 100,
    [hardLiquidationLtv, riskyLtv],
  )
  const liquidationWidth = useMemo(() => (1 - hardLiquidationLtv) * 100, [hardLiquidationLtv])

  // Position of skull icon at the hard liquidation boundary
  const skullPosition = useMemo(() => hardLiquidationLtv * 100, [hardLiquidationLtv])

  return (
    <Box width='full'>
      {/* Multi-segment progress bar */}
      <Box position='relative' height='40px'>
        {/* Bar track */}
        <Flex
          position='absolute'
          top='50%'
          left='0'
          right='0'
          transform='translateY(-50%)'
          height={GAUGE_HEIGHT}
          borderRadius='full'
          overflow='hidden'
        >
          {/* Safe segment (green) */}
          <Box width={`${safeWidth}%`} height='full' bg='green.500' opacity={0.3} />
          {/* Risky segment (yellow) */}
          <Box width={`${riskyWidth}%`} height='full' bg='yellow.500' opacity={0.3} />
          {/* Liquidation segment (red) */}
          <Box width={`${liquidationWidth}%`} height='full' bg='red.500' opacity={0.3} />
        </Flex>

        {/* Filled portion up to current LTV */}
        <Box
          position='absolute'
          top='50%'
          left='0'
          transform='translateY(-50%)'
          height={GAUGE_HEIGHT}
          width={`${thumbPosition}%`}
          borderLeftRadius='full'
          borderRightRadius={thumbPosition >= 100 ? 'full' : '0'}
          overflow='hidden'
          transition='width 0.3s ease'
        >
          <Flex height='full' width={`${(100 / thumbPosition) * 100}%`}>
            <Box width={`${safeWidth}%`} height='full' bg='green.500' flexShrink={0} />
            <Box width={`${riskyWidth}%`} height='full' bg='yellow.500' flexShrink={0} />
            <Box width={`${liquidationWidth}%`} height='full' bg='red.500' flexShrink={0} />
          </Flex>
        </Box>

        {/* Skull icon at hard liquidation boundary */}
        <Box
          position='absolute'
          top='50%'
          left={`${skullPosition}%`}
          transform='translate(-50%, -50%)'
          zIndex={2}
        >
          <Circle size='18px' bg='background.surface.raised.base'>
            <Icon as={TbSkull} boxSize='12px' color='red.500' />
          </Circle>
        </Box>

        {/* Projected LTV thumb (dashed circle) */}
        {projectedThumbPosition !== undefined && (
          <Box
            position='absolute'
            top='50%'
            left={`${projectedThumbPosition}%`}
            transform='translate(-50%, -50%)'
            zIndex={3}
            transition='left 0.3s ease'
          >
            <Circle
              size={THUMB_SIZE}
              borderWidth='2px'
              borderStyle='dashed'
              borderColor={getStatusColor(projectedLtv ?? 0, riskyLtv, hardLiquidationLtv)}
              bg='transparent'
            />
          </Box>
        )}

        {/* Current LTV thumb */}
        <Box
          position='absolute'
          top='50%'
          left={`${thumbPosition}%`}
          transform='translate(-50%, -50%)'
          zIndex={4}
          transition='left 0.3s ease'
        >
          <Circle
            size={THUMB_SIZE}
            bg={statusColor}
            borderWidth='3px'
            borderColor='background.surface.base'
          />
        </Box>
      </Box>

      {/* Percentage labels under the bar */}
      <Flex justifyContent='space-between' mt={1}>
        <Text fontSize='2xs' color='text.subtle'>
          0%
        </Text>
        <Text fontSize='2xs' color='text.subtle'>
          100%
        </Text>
      </Flex>

      {/* Legend */}
      <Flex justifyContent='center' alignItems='center' gap={4} mt={2}>
        {legendItems.map(item => (
          <Flex key={item.labelKey} alignItems='center' gap={1.5}>
            <Circle size='8px' bg={item.color} />
            <Text fontSize='xs' color='text.subtle'>
              {translate(item.labelKey)}
            </Text>
          </Flex>
        ))}
      </Flex>
    </Box>
  )
})
