import { Flex } from '@chakra-ui/react'
import { useCallback } from 'react'
import { Route, Switch, useLocation } from 'react-router-dom'

import { LimitOrderConfirm as LimitOrderShared } from '../LimitOrderV2/LimitOrderConfirm'
import { SlideTransitionRoute } from '../SlideTransitionRoute'
import { AllowanceApproval } from './components/AllowanceApproval'
import { LimitOrderConfirm } from './components/LimitOrderConfirm'
import { LimitOrderInput } from './components/LimitOrderInput'
import { LimitOrderList } from './components/LimitOrderList'
import { PlaceLimitOrder } from './components/PlaceLimitOrder'
import { LimitOrderRoutePaths } from './types'

import type { TradeInputTab } from '@/components/MultiHopTrade/types'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'

type LimitOrderProps = {
  tradeInputRef: React.MutableRefObject<HTMLDivElement | null>
  isCompact?: boolean
  onChangeTab: (newTab: TradeInputTab) => void
}

export const LimitOrder = ({ isCompact, tradeInputRef, onChangeTab }: LimitOrderProps) => {
  const location = useLocation()
  const isNewLimitFlowEnabled = useFeatureFlag('NewLimitFlow')

  const renderLimitOrderInput = useCallback(() => {
    return (
      <LimitOrderInput
        isCompact={isCompact}
        tradeInputRef={tradeInputRef}
        onChangeTab={onChangeTab}
      />
    )
  }, [isCompact, tradeInputRef, onChangeTab])

  const renderLimitOrderConfirm = useCallback(() => {
    return <LimitOrderConfirm />
  }, [])

  const renderLimitOrderShared = useCallback(() => {
    return <LimitOrderShared />
  }, [])

  const renderAllowanceApproval = useCallback(() => {
    return <AllowanceApproval />
  }, [])

  const renderPlaceOrder = useCallback(() => {
    return <PlaceLimitOrder isCompact={isCompact} />
  }, [isCompact])

  return (
    <Switch location={location}>
      <Flex flex={1} width='full' justifyContent='center'>
        <Route
          key={LimitOrderRoutePaths.Confirm}
          path={LimitOrderRoutePaths.Confirm}
          render={isNewLimitFlowEnabled ? renderLimitOrderShared : renderLimitOrderConfirm}
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
        <Route
          key={LimitOrderRoutePaths.Input}
          path={LimitOrderRoutePaths.Input}
          exact
          render={renderLimitOrderInput}
        />
      </Flex>
    </Switch>
  )
}
