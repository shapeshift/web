import { Flex } from '@chakra-ui/react'
import { useCallback, useEffect } from 'react'
import { Route, Switch, useHistory, useLocation } from 'react-router-dom'

import { LimitOrderConfirm as LimitOrderShared } from '../LimitOrderV2/LimitOrderConfirm'
import { SlideTransitionRoute } from '../SlideTransitionRoute'
import { AllowanceApproval } from './components/AllowanceApproval'
import { LimitOrderConfirm } from './components/LimitOrderConfirm'
import { LimitOrderInput } from './components/LimitOrderInput'
import { LimitOrderList } from './components/LimitOrderList'
import { PlaceLimitOrder } from './components/PlaceLimitOrder'
import { LimitOrderRoutePaths } from './types'

import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'

type LimitOrderProps = {
  tradeInputRef: React.MutableRefObject<HTMLDivElement | null>
  isCompact?: boolean
}

export const LimitOrder = ({ isCompact, tradeInputRef }: LimitOrderProps) => {
  const location = useLocation()
  const history = useHistory()
  const isNewLimitFlowEnabled = useFeatureFlag('NewLimitFlow')

  useEffect(() => {
    if (location.pathname === '/trade/limit-order') {
      history.replace(LimitOrderRoutePaths.Input)
    }
  }, [history, location.pathname])

  const renderLimitOrderInput = useCallback(() => {
    return <LimitOrderInput isCompact={isCompact} tradeInputRef={tradeInputRef} />
  }, [isCompact, tradeInputRef])

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
        <Route path={LimitOrderRoutePaths.Input} render={renderLimitOrderInput} />
        <Route
          path={LimitOrderRoutePaths.Confirm}
          render={isNewLimitFlowEnabled ? renderLimitOrderShared : renderLimitOrderConfirm}
        />
        <Route path={LimitOrderRoutePaths.AllowanceApproval} render={renderAllowanceApproval} />
        <Route path={LimitOrderRoutePaths.PlaceOrder} render={renderPlaceOrder} />
        <Route path={LimitOrderRoutePaths.Orders}>
          <SlideTransitionRoute
            height={tradeInputRef.current?.offsetHeight ?? '500px'}
            width={tradeInputRef.current?.offsetWidth ?? 'full'}
            component={LimitOrderList}
            parentRoute={LimitOrderRoutePaths.Input}
          />
        </Route>
      </Flex>
    </Switch>
  )
}
