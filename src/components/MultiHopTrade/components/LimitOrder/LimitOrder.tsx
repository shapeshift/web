import { Flex } from '@chakra-ui/react'
import { useCallback, useEffect, useRef } from 'react'
import { MemoryRouter, Route, Switch, useHistory, useLocation } from 'react-router-dom'

import { useMultiHopTradeContext } from '../../context/MultiHopTradeContext'
import { LimitOrderConfirm as LimitOrderShared } from '../LimitOrderV2/LimitOrderConfirm'
import { SlideTransitionRoute } from '../SlideTransitionRoute'
import { AllowanceApproval } from './components/AllowanceApproval'
import { LimitOrderConfirm } from './components/LimitOrderConfirm'
import { LimitOrderInput } from './components/LimitOrderInput'
import { LimitOrderList } from './components/LimitOrderList'
import { PlaceLimitOrder } from './components/PlaceLimitOrder'
import { LimitOrderRoutePaths } from './types'

import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'

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
}

export const LimitOrder = ({ isCompact, tradeInputRef }: LimitOrderProps) => {
  const location = useLocation()
  const isNewLimitFlowEnabled = useFeatureFlag('NewLimitFlow')
  const memoryRouterHistoryRef = useRef<any>(null)
  const { activeTab } = useMultiHopTradeContext()

  // Navigate the MemoryRouter to the Input route when the active tab changes to LimitOrder
  useEffect(() => {
    if (memoryRouterHistoryRef.current && activeTab === 'limitOrder') {
      // Navigate to the Input route in the MemoryRouter
      memoryRouterHistoryRef.current.push(LimitOrderRoutePaths.Input)
    }
  }, [activeTab])

  const renderLimitOrderInput = useCallback(() => {
    return (
      <LimitOrderInput
        isCompact={isCompact}
        tradeInputRef={tradeInputRef}
      />
    )
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

  // This component will be rendered inside the MemoryRouter
  const LimitOrderContent = () => {
    const history = useHistory()
    
    // Store the history object in the ref so we can access it from outside
    useEffect(() => {
      memoryRouterHistoryRef.current = history
    }, [history])
    
    return (
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
        </Flex>
      </Switch>
    )
  }

  return (
    <MemoryRouter initialEntries={LimitOrderRouteEntries} initialIndex={0}>
      <LimitOrderContent />
    </MemoryRouter>
  )
}
