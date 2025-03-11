import { Flex } from '@chakra-ui/react'
import { useCallback } from 'react'
import { Route, Switch, useHistory, useLocation } from 'react-router-dom'

import { LimitOrderConfirm as LimitOrderShared } from '../LimitOrderV2/LimitOrderConfirm'
import { SlideTransitionRoute } from '../SlideTransitionRoute'
import { AllowanceApproval } from './components/AllowanceApproval'
import { LimitOrderConfirm } from './components/LimitOrderConfirm'
import { LimitOrderInput } from './components/LimitOrderInput'
import { LimitOrderList } from './components/LimitOrderList'
import { PlaceLimitOrder } from './components/PlaceLimitOrder'
import { LimitOrderRoutePaths } from './types'

import { ClaimRoutePaths } from '@/components/MultiHopTrade/components/TradeInput/components/Claim/types'
import type { TradeInputTab } from '@/components/MultiHopTrade/types'
import { TradeRoutePaths } from '@/components/MultiHopTrade/types'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'

type LimitOrderProps = {
  tradeInputRef: React.MutableRefObject<HTMLDivElement | null>
  isCompact?: boolean
  onChangeTab: (newTab: TradeInputTab) => void
}

export const LimitOrder = ({ isCompact, tradeInputRef }: LimitOrderProps) => {
  const location = useLocation()
  const history = useHistory()
  const isNewLimitFlowEnabled = useFeatureFlag('NewLimitFlow')

  const handleTabChange = useCallback(
    (tab: TradeInputTab) => {
      switch (tab) {
        case 'trade':
          history.push(TradeRoutePaths.Input)
          break
        case 'claim':
          history.push(ClaimRoutePaths.Select)
          break
        case 'limitOrder':
          // Already on limit order, do nothing
          break
        default:
          break
      }
    },
    [history],
  )

  const renderLimitOrderInput = useCallback(() => {
    return (
      <LimitOrderInput
        isCompact={isCompact}
        tradeInputRef={tradeInputRef}
        onChangeTab={handleTabChange}
      />
    )
  }, [isCompact, tradeInputRef, handleTabChange])

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
        <Route path={LimitOrderRoutePaths.Input} exact render={renderLimitOrderInput} />
      </Flex>
    </Switch>
  )
}
