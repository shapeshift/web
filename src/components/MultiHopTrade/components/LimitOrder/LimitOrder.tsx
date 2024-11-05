import { Box, Flex } from '@chakra-ui/react'
import { useCallback } from 'react'
import { MemoryRouter, Route, Switch, useLocation } from 'react-router'
import type { TradeInputTab } from 'components/MultiHopTrade/types'

import { LimitOrderConfirm } from './components/LimitOrderConfirm'
import { LimitOrderInput } from './components/LimitOrderInput'
import { LimitOrderStatus } from './components/LimitOrderStatus'
import { LimitOrderRoutePaths } from './types'

const LimitOrderRouteEntries = [
  LimitOrderRoutePaths.Input,
  LimitOrderRoutePaths.Confirm,
  LimitOrderRoutePaths.Status,
]

type LimitOrderProps = {
  tradeInputRef: React.MutableRefObject<HTMLDivElement | null>
  isCompact?: boolean
  onChangeTab: (newTab: TradeInputTab) => void
}

export const LimitOrder = ({ isCompact, tradeInputRef, onChangeTab }: LimitOrderProps) => {
  const location = useLocation()

  const renderLimitOrderInput = useCallback(() => {
    return (
      <LimitOrderInput
        isCompact={isCompact}
        tradeInputRef={tradeInputRef}
        onChangeTab={onChangeTab}
      />
    )
  }, [isCompact, onChangeTab, tradeInputRef])

  const renderLimitOrderConfirm = useCallback(() => {
    return <LimitOrderConfirm />
  }, [])

  const renderLimitOrderStatus = useCallback(() => {
    return <LimitOrderStatus />
  }, [])

  return (
    <MemoryRouter initialEntries={LimitOrderRouteEntries} initialIndex={0}>
      <Switch location={location}>
        <Flex flex={1} width='full' justifyContent='center'>
          <Route
            key={LimitOrderRoutePaths.Input}
            path={LimitOrderRoutePaths.Input}
            render={renderLimitOrderInput}
          />
          <Route
            key={LimitOrderRoutePaths.Confirm}
            path={LimitOrderRoutePaths.Confirm}
            render={renderLimitOrderConfirm}
          />
          <Route
            key={LimitOrderRoutePaths.Status}
            path={LimitOrderRoutePaths.Status}
            render={renderLimitOrderStatus}
          />
        </Flex>
      </Switch>
    </MemoryRouter>
  )
}
