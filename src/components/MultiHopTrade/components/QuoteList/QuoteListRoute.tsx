import { Center, Flex, useMediaQuery } from '@chakra-ui/react'
import { useCallback, useState } from 'react'
import { useHistory } from 'react-router'
import { TradeSlideTransition } from 'components/MultiHopTrade/TradeSlideTransition'
import { TradeRoutePaths } from 'components/MultiHopTrade/types'
import { breakpoints } from 'theme/theme'

import { QuoteList } from './QuoteList'

type QuoteListRouteProps = {
  height: string | number
  width: string | number
}

export const QuoteListRoute = ({
  width: initialWidth,
  height: initialHeight,
}: QuoteListRouteProps) => {
  const [width] = useState(initialWidth)
  const [height] = useState(initialHeight)
  const history = useHistory()
  const [isSmallerThanXl] = useMediaQuery(`(max-width: ${breakpoints.xl})`)

  const handleCloseCompactQuoteList = useCallback(
    () => history.push({ pathname: TradeRoutePaths.Input }),
    [history],
  )

  return (
    <TradeSlideTransition>
      <Flex width='full' justifyContent='center' maxWidth={isSmallerThanXl ? '500px' : undefined}>
        <Center width='inherit'>
          <QuoteList
            onBack={handleCloseCompactQuoteList}
            isLoading={false}
            height={height}
            width={width}
          />
        </Center>
      </Flex>
    </TradeSlideTransition>
  )
}
