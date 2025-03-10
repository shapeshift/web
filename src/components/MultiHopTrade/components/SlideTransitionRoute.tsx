import type { CardProps } from '@chakra-ui/react'
import { Box, Center, Flex, useMediaQuery } from '@chakra-ui/react'
import type { FC } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { useHistory } from 'react-router-dom'

import type { LimitOrderRoutePaths } from './LimitOrder/types'

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
  parentRoute: TradeRoutePaths | LimitOrderRoutePaths
}

export const SlideTransitionRoute = ({
  width: initialWidth,
  height: initialHeight,
  component: Component,
  parentRoute,
}: SlideTransitionRouteProps) => {
  const [width] = useState(initialWidth)
  const [height] = useState(initialHeight)
  const history = useHistory()
  const [isSmallerThanXl] = useMediaQuery(`(max-width: ${breakpoints.xl})`)

  const handleBack = useCallback(() => {
    // Extract the base route from the parent route
    const baseRoute = parentRoute.split('/')[1]
    history.push(`/${baseRoute}`)
  }, [history, parentRoute])

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
