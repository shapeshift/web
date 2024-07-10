import type { CardProps } from '@chakra-ui/react'
import { Card, CardHeader, Center, Flex } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useHistory } from 'react-router'
import { TradeSlideTransition } from 'components/MultiHopTrade/TradeSlideTransition'
import { TradeRoutePaths } from 'components/MultiHopTrade/types'

import { TradeInputHeader } from '../TradeInput/components/TradeInputHeader'

export const Claims = (props: CardProps) => {
  const history = useHistory()
  const handleClickTrade = useCallback(() => {
    history.push(TradeRoutePaths.Input)
  }, [history])

  return (
    <TradeSlideTransition>
      <Flex width='full' justifyContent='center'>
        <Center width='inherit'>
          <Card {...props}>
            <CardHeader px={6}>
              <TradeInputHeader onClickTrade={handleClickTrade} />
            </CardHeader>
          </Card>
        </Center>
      </Flex>
    </TradeSlideTransition>
  )
}
