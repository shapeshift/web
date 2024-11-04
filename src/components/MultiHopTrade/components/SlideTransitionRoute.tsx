import type { CardProps } from '@chakra-ui/react'
import { Center, Flex, useMediaQuery } from '@chakra-ui/react'
import type { FC } from 'react'
import { useCallback, useState } from 'react'
import { useHistory } from 'react-router'
import { TradeSlideTransition } from 'components/MultiHopTrade/TradeSlideTransition'
import type { TradeRoutePaths } from 'components/MultiHopTrade/types'
import { breakpoints } from 'theme/theme'

type SlideTransitionComponentProps = {
  onBack?: () => void
  isLoading: boolean
} & CardProps

type SlideTransitionRouteProps = {
  height: string | number
  width: string | number
  component: FC<SlideTransitionComponentProps>
  parentRoute: TradeRoutePaths
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

  const handleClose = useCallback(() => {
    history.push({ pathname: parentRoute })
  }, [history, parentRoute])

  return (
    <TradeSlideTransition>
      <Flex width='full' justifyContent='center' maxWidth={isSmallerThanXl ? '500px' : undefined}>
        <Center width='inherit'>
          <Component onBack={handleClose} isLoading={false} height={height} width={width} />
        </Center>
      </Flex>
    </TradeSlideTransition>
  )
}
