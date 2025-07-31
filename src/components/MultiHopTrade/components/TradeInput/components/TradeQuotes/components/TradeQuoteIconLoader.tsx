import { Flex, useColorModeValue } from '@chakra-ui/react'
import type { SwapperName } from '@shapeshiftoss/swapper'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { SwapperIcon } from '../../SwapperIcon/SwapperIcon'

const TOTAL_ICON_VISIBLE = 5
const ICON_INITIAL_OFFSET = Math.floor(TOTAL_ICON_VISIBLE / 2)

const ICON_WITH_WRAP_WIDTH_PX = 52
const INNER_ICON_WIDTH_PX = 32
const MARGIN_RIGHT_PX = 12
const ICON_MAX_SPACE_PX = ICON_WITH_WRAP_WIDTH_PX + MARGIN_RIGHT_PX

export const VISIBLE_WIDTH = ICON_MAX_SPACE_PX * TOTAL_ICON_VISIBLE

const TRANSITION_TIMING = '0.5s cubic-bezier(0.4, 0, 0.2, 1)'

type TradeQuoteIconLoaderProps = {
  swapperNames: SwapperName[]
  className?: string
}

export const TradeQuoteIconLoader: React.FC<TradeQuoteIconLoaderProps> = ({
  className,
  swapperNames,
}) => {
  // Bit of buffer here to make it feel "continuous" for enough time for the loader to finish
  const continuousSwapperNames = useMemo(
    () => [...swapperNames, ...swapperNames, ...swapperNames],
    [swapperNames],
  )

  const backgroundColor = useColorModeValue('blackAlpha.50', 'whiteAlpha.50')
  const borderColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.100')
  const [currentCenterIndex, setCurrentCenterIndex] = useState<number>(ICON_INITIAL_OFFSET)

  // Create multiple copies for seamless looping
  const totalItems = continuousSwapperNames.length

  const handleAdvanceCarousel = useCallback((): void => {
    setCurrentCenterIndex(prev => {
      const next = prev + 1
      // Reset when we've gone through the first full cycle plus buffer
      if (next >= totalItems - ICON_INITIAL_OFFSET) {
        return ICON_INITIAL_OFFSET // Jump back to start position (first real item centered)
      }
      return next
    })
  }, [totalItems])

  useEffect(() => {
    if (totalItems <= TOTAL_ICON_VISIBLE) return

    const interval = setInterval(handleAdvanceCarousel, 1000)

    return () => clearInterval(interval)
  }, [handleAdvanceCarousel, totalItems])

  return (
    <Flex
      className={className}
      alignItems='center'
      overflow='hidden'
      position='relative'
      backgroundColor={backgroundColor}
      rounded='full'
      borderColor={borderColor}
      borderWidth='1px'
      width={`${VISIBLE_WIDTH}px`}
    >
      <Flex
        alignItems='center'
        transition={`transform ${TRANSITION_TIMING}`}
        transform={`translateX(${
          (ICON_INITIAL_OFFSET - currentCenterIndex) * ICON_MAX_SPACE_PX
        }px)`}
        width={`${totalItems * ICON_MAX_SPACE_PX}px`}
      >
        {continuousSwapperNames.map((swapperName, index) => {
          // Calculate distance from current center to determine styling
          const isCenterItem = index === currentCenterIndex

          return (
            <Flex
              key={index}
              width={`${ICON_WITH_WRAP_WIDTH_PX}px`}
              height={`${ICON_WITH_WRAP_WIDTH_PX}px`}
              marginRight={`${MARGIN_RIGHT_PX}px`}
              borderRadius='full'
              backgroundColor={isCenterItem ? backgroundColor : undefined}
              borderColor={isCenterItem ? borderColor : 'transparent'}
              transition={`border-color ${TRANSITION_TIMING}, background-color ${TRANSITION_TIMING}`}
              borderWidth='1px'
              flexShrink={0}
              alignItems='center'
              justifyContent='center'
            >
              <Flex
                width={`${INNER_ICON_WIDTH_PX}px`}
                height={`${INNER_ICON_WIDTH_PX}px`}
                borderRadius='full'
                alignItems='center'
                justifyContent='center'
                transition={`all ${TRANSITION_TIMING}`}
                opacity={isCenterItem ? 1 : 0.6}
                transform={`scale(${isCenterItem ? 1.3 : 1})`}
                flexShrink={0}
              >
                <SwapperIcon swapperName={swapperName} size='sm' />
              </Flex>
            </Flex>
          )
        })}
      </Flex>
    </Flex>
  )
}
