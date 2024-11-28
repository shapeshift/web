import { Flex } from '@chakra-ui/react'
import { useCallback } from 'react'
import { MemoryRouter, Route, Switch, useLocation } from 'react-router'
import type { TradeInputTab } from 'components/MultiHopTrade/types'

import { SlideTransitionRoute } from '../SlideTransitionRoute'
import { LimitOrderConfirm } from './components/LimitOrderConfirm'
import { LimitOrderInput } from './components/LimitOrderInput'
import { PlaceLimitOrder } from './components/PlaceLimitOrder'
import { LimitOrderList } from './LimitOrderList'
import { LimitOrderRoutePaths } from './types'

const LimitOrderRouteEntries = [
  LimitOrderRoutePaths.Input,
  LimitOrderRoutePaths.Confirm,
  LimitOrderRoutePaths.AllowanceApproval,
  LimitOrderRoutePaths.PlaceOrder,
  LimitOrderRoutePaths.Orders,
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

  const renderAllowanceApproval = useCallback(() => {
    // TODO: Implement me!
    return null
  }, [])

  const renderPlaceOrder = useCallback(() => {
    return <PlaceLimitOrder />
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
            key={LimitOrderRoutePaths.AllowanceApproval}
            path={LimitOrderRoutePaths.AllowanceApproval}
            render={renderAllowanceApproval}
          />
          <Route
            key={LimitOrderRoutePaths.PlaceOrder}
            path={LimitOrderRoutePaths.PlaceOrder}
            render={renderPlaceOrder}
          />
          <Route key={LimitOrderRoutePaths.Orders} path={LimitOrderRoutePaths.Orders}>
            <SlideTransitionRoute
              height={tradeInputRef.current?.offsetHeight ?? '500px'}
              width={tradeInputRef.current?.offsetWidth ?? 'full'}
              component={LimitOrderList}
              parentRoute={LimitOrderRoutePaths.Input}
            />
          </Route>
        </Flex>
      </Switch>
    </MemoryRouter>
  )
}
