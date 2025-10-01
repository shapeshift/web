import type { CardProps } from '@chakra-ui/react'
import { Box, Center, Flex, useMediaQuery } from '@chakra-ui/react'
import type { FC } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import type { LimitOrderRoutePaths } from './LimitOrder/types'

import type { FiatRampRoutePaths } from '@/components/MultiHopTrade/components/FiatRamps/types'
import { TradeSlideTransition } from '@/components/MultiHopTrade/TradeSlideTransition'
import type { TradeRoutePaths } from '@/components/MultiHopTrade/types'
import { breakpoints } from '@/theme/theme'

type SlideTransitionComponentProps = {
  onBack?: () => void
  isLoading: boolean
  cardProps?: CardProps
}

type SlideTransitionRouteProps = {
  height: string | number
  width: string | number
  component: FC<SlideTransitionComponentProps>
  parentRoute: TradeRoutePaths | LimitOrderRoutePaths | FiatRampRoutePaths
}

export const SlideTransitionRoute = ({
  width: initialWidth,
  height: initialHeight,
  component: Component,
  parentRoute,
}: SlideTransitionRouteProps) => {
  const [width] = useState(initialWidth)
  const [height] = useState(initialHeight)
  const navigate = useNavigate()
  const [isSmallerThanXl] = useMediaQuery(`(max-width: ${breakpoints.xl})`)

  const handleBack = useCallback(() => {
    navigate(parentRoute)
  }, [navigate, parentRoute])

  const cardProps: CardProps = useMemo(
    () => ({
      width,
      height,
    }),
    [width, height],
  )

  return (
    <Center width='inherit' alignItems='flex-end'>
      <Box width='full' maxWidth='500px'>
        <TradeSlideTransition>
          <Flex
            width='full'
            justifyContent='center'
            maxWidth={isSmallerThanXl ? '500px' : undefined}
          >
            <Center width='inherit'>
              <Component onBack={handleBack} isLoading={false} cardProps={cardProps} />
            </Center>
          </Flex>
        </TradeSlideTransition>
      </Box>
    </Center>
  )
}
