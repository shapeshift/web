import { Box, Flex, Text } from '@chakra-ui/react'
import { memo, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { useChainflipLtvThresholds } from '@/pages/ChainflipLending/hooks/useChainflipLtvThresholds'

type LtvGaugeProps = {
  currentLtv: number
  projectedLtv?: number
}

const GAUGE_HEIGHT = '12px'
const MARKER_HEIGHT = '24px'
const LABEL_TOP = '32px'

const ltvToPercent = (ltv: number): string => `${Math.min(Math.max(ltv * 100, 0), 100)}%`

const ltvToDisplayPercent = (ltv: number): string =>
  `${(Math.min(Math.max(ltv, 0), 1) * 100).toFixed(1)}%`

const DEFAULT_SOFT_LIQUIDATION_LTV = 0.8
const DEFAULT_HARD_LIQUIDATION_LTV = 0.9

const getStatusColor = (
  ltv: number,
  softLiquidationLtv: number,
  hardLiquidationLtv: number,
): string => {
  if (ltv >= hardLiquidationLtv) return 'red.500'
  if (ltv >= softLiquidationLtv) return 'yellow.500'
  return 'green.500'
}

const getStatusKey = (
  ltv: number,
  softLiquidationLtv: number,
  hardLiquidationLtv: number,
): string => {
  if (ltv >= hardLiquidationLtv) return 'chainflipLending.ltv.danger'
  if (ltv >= softLiquidationLtv) return 'chainflipLending.ltv.warning'
  return 'chainflipLending.ltv.safe'
}

export const LtvGauge = memo(({ currentLtv, projectedLtv }: LtvGaugeProps) => {
  const translate = useTranslate()
  const { thresholds } = useChainflipLtvThresholds()

  const softLiquidationLtv = thresholds?.softLiquidation ?? DEFAULT_SOFT_LIQUIDATION_LTV
  const hardLiquidationLtv = thresholds?.hardLiquidation ?? DEFAULT_HARD_LIQUIDATION_LTV

  const statusColor = useMemo(
    () => getStatusColor(currentLtv, softLiquidationLtv, hardLiquidationLtv),
    [currentLtv, softLiquidationLtv, hardLiquidationLtv],
  )
  const statusKey = useMemo(
    () => getStatusKey(currentLtv, softLiquidationLtv, hardLiquidationLtv),
    [currentLtv, softLiquidationLtv, hardLiquidationLtv],
  )

  const gaugeGradient = useMemo(
    () =>
      `linear(to-r, green.500 0%, green.500 ${softLiquidationLtv * 100}%, yellow.500 ${
        softLiquidationLtv * 100
      }%, yellow.500 ${hardLiquidationLtv * 100}%, red.500 ${
        hardLiquidationLtv * 100
      }%, red.800 100%)`,
    [softLiquidationLtv, hardLiquidationLtv],
  )

  const thresholdMarkers = useMemo(() => {
    if (!thresholds) return []
    return [
      {
        value: thresholds.target,
        labelKey: 'chainflipLending.ltv.target',
        color: 'green.500',
      },
      {
        value: thresholds.softLiquidation,
        labelKey: 'chainflipLending.ltv.softLiquidation',
        color: 'yellow.500',
      },
      {
        value: thresholds.hardLiquidation,
        labelKey: 'chainflipLending.ltv.hardLiquidation',
        color: 'red.500',
      },
    ]
  }, [thresholds])

  return (
    <Box width='full'>
      <Box position='relative' height='60px'>
        <Box
          position='absolute'
          top='0'
          left='0'
          right='0'
          height={GAUGE_HEIGHT}
          borderRadius='full'
          overflow='hidden'
        >
          <Box width='full' height='full' bgGradient={gaugeGradient} opacity={0.3} />
        </Box>

        <Box
          position='absolute'
          top='0'
          left={ltvToPercent(currentLtv)}
          transform='translateX(-50%)'
          width='4px'
          height={MARKER_HEIGHT}
          bg={statusColor}
          borderRadius='full'
          zIndex={2}
        />

        {projectedLtv !== undefined && (
          <Box
            position='absolute'
            top='0'
            left={ltvToPercent(projectedLtv)}
            transform='translateX(-50%)'
            width='4px'
            height={MARKER_HEIGHT}
            borderWidth='2px'
            borderStyle='dashed'
            borderColor={getStatusColor(projectedLtv, softLiquidationLtv, hardLiquidationLtv)}
            borderRadius='full'
            zIndex={1}
          />
        )}

        {thresholdMarkers.map(marker => (
          <Box key={marker.labelKey}>
            <Box
              position='absolute'
              top='0'
              left={ltvToPercent(marker.value)}
              transform='translateX(-50%)'
              width='2px'
              height={GAUGE_HEIGHT}
              bg={marker.color}
              opacity={0.6}
            />
            <Text
              position='absolute'
              top={LABEL_TOP}
              left={ltvToPercent(marker.value)}
              transform='translateX(-50%)'
              fontSize='2xs'
              color='text.subtle'
              whiteSpace='nowrap'
            >
              {translate(marker.labelKey)}
            </Text>
          </Box>
        ))}
      </Box>

      <Flex justifyContent='space-between' alignItems='center' mt={2}>
        <Text fontSize='sm' fontWeight='bold' color={statusColor}>
          {ltvToDisplayPercent(currentLtv)}
        </Text>
        <Text fontSize='sm' color={statusColor}>
          {translate(statusKey)}
        </Text>
      </Flex>
    </Box>
  )
})
