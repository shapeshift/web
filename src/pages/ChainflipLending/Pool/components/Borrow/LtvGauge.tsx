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

// Fallback thresholds when config hasn't loaded
const DEFAULT_LOW_LTV = 0.5
const DEFAULT_TARGET = 0.8
const DEFAULT_SOFT_LIQUIDATION = 0.9
const DEFAULT_TOPUP = 0.85
const DEFAULT_HARD_LIQUIDATION = 0.93

const ltvToPercent = (ltv: number): number => Math.min(Math.max(ltv * 100, 0), 100)

type Zone = {
  labelKey: string
  color: string
  width: number
}

const getStatusColor = (
  ltv: number,
  targetLtv: number,
  softLiqLtv: number,
  hardLiqLtv: number,
): string => {
  if (ltv >= hardLiqLtv) return 'red.500'
  if (ltv >= softLiqLtv) return 'yellow.500'
  if (ltv >= targetLtv) return 'yellow.300'
  return 'green.500'
}

export const LtvGauge = memo(({ currentLtv, projectedLtv }: LtvGaugeProps) => {
  const translate = useTranslate()
  const { thresholds } = useChainflipLtvThresholds()

  const lowLtv = thresholds?.lowLtv ?? DEFAULT_LOW_LTV
  const targetLtv = thresholds?.target ?? DEFAULT_TARGET
  const topupLtv = thresholds?.topup ?? DEFAULT_TOPUP
  const softLiqLtv = thresholds?.softLiquidation ?? DEFAULT_SOFT_LIQUIDATION
  const hardLiqLtv = thresholds?.hardLiquidation ?? DEFAULT_HARD_LIQUIDATION

  const thumbPosition = useMemo(() => ltvToPercent(currentLtv), [currentLtv])

  const projectedThumbPosition = useMemo(
    () => (projectedLtv !== undefined ? ltvToPercent(projectedLtv) : undefined),
    [projectedLtv],
  )

  // 4 zones based on protocol thresholds
  const zones: Zone[] = useMemo(
    () => [
      {
        labelKey: 'chainflipLending.ltv.conservative',
        color: 'green.700',
        width: lowLtv * 100,
      },
      {
        labelKey: 'chainflipLending.ltv.optimal',
        color: 'green.500',
        width: (targetLtv - lowLtv) * 100,
      },
      {
        labelKey: 'chainflipLending.ltv.risky',
        color: 'yellow.500',
        width: (softLiqLtv - targetLtv) * 100,
      },
      {
        labelKey: 'chainflipLending.ltv.liquidation',
        color: 'red.500',
        width: (1 - softLiqLtv) * 100,
      },
    ],
    [lowLtv, targetLtv, softLiqLtv],
  )

  const skullPosition = useMemo(() => hardLiqLtv * 100, [hardLiqLtv])
  const topupPosition = useMemo(() => topupLtv * 100, [topupLtv])

  return (
    <Box width='full'>
      {/* Multi-segment progress bar */}
      <Box position='relative' height='40px'>
        {/* Bar track - 4 zone segments */}
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
          {zones.map(zone => (
            <Box
              key={zone.labelKey}
              width={`${zone.width}%`}
              height='full'
              bg={zone.color}
              opacity={0.3}
            />
          ))}
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
          <Flex height='full' width={`${thumbPosition > 0 ? (100 / thumbPosition) * 100 : 100}%`}>
            {zones.map(zone => (
              <Box
                key={zone.labelKey}
                width={`${zone.width}%`}
                height='full'
                bg={zone.color}
                flexShrink={0}
              />
            ))}
          </Flex>
        </Box>

        {/* Topup threshold marker (subtle tick at 85%) */}
        <Box
          position='absolute'
          top='50%'
          left={`${topupPosition}%`}
          transform='translate(-50%, -50%)'
          height='16px'
          width='1px'
          bg='yellow.500'
          opacity={0.6}
          zIndex={1}
        />

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
              borderColor={getStatusColor(projectedLtv ?? 0, targetLtv, softLiqLtv, hardLiqLtv)}
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
          <Circle size='12px' bg='white' boxShadow='0 0 4px rgba(0,0,0,0.5)' />
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

      {/* Legend - 4 zones */}
      <Flex justifyContent='center' alignItems='center' gap={4} mt={2}>
        {zones.map(zone => (
          <Flex key={zone.labelKey} alignItems='center' gap={1.5}>
            <Circle size='8px' bg={zone.color} />
            <Text fontSize='xs' color='text.subtle'>
              {translate(zone.labelKey)}
            </Text>
          </Flex>
        ))}
      </Flex>
    </Box>
  )
})
