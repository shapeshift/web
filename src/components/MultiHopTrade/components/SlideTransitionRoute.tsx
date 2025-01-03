import type { CardProps } from '@chakra-ui/react'
import { Box, Center, Flex, useMediaQuery } from '@chakra-ui/react'
import type { FC } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { useHistory } from 'react-router'
import { TradeSlideTransition } from 'components/MultiHopTrade/TradeSlideTransition'
import type { TradeRoutePaths } from 'components/MultiHopTrade/types'
import { ThorFreeFeeBanner } from 'components/ThorFreeFeeBanner/ThorFreeFeeBanner'
import { THORSWAP_MAXIMUM_YEAR_TRESHOLD } from 'lib/fees/model'
import { breakpoints } from 'theme/theme'

import type { LimitOrderRoutePaths } from './LimitOrder/types'

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
    history.push({ pathname: parentRoute })
  }, [history, parentRoute])

  const cardProps: CardProps = useMemo(
    () => ({
      width,
      height,
    }),
    [width, height],
  )

  const shouldDisplayThorFreeFeeBanner = useMemo(
    () => new Date().getUTCFullYear() < THORSWAP_MAXIMUM_YEAR_TRESHOLD,
    [],
  )

  return (
    <Center width='inherit' alignItems='flex-end'>
      <Box width='full' maxWidth='500px'>
        {shouldDisplayThorFreeFeeBanner ? <ThorFreeFeeBanner /> : null}
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
