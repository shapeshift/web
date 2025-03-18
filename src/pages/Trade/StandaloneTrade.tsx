import { useCallback } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { MemoryRouter, Route, Switch, useHistory, useLocation } from 'react-router-dom'

import { LimitOrderRoutePaths } from '@/components/MultiHopTrade/components/LimitOrder/types'
import { ClaimRoutePaths } from '@/components/MultiHopTrade/components/TradeInput/components/Claim/types'
import type { TradeCardProps } from '@/components/MultiHopTrade/MultiHopTrade'
import { MultiHopTrade } from '@/components/MultiHopTrade/MultiHopTrade'
import { TradeInputTab, TradeRoutePaths } from '@/components/MultiHopTrade/types'

type StandaloneTradeProps = Omit<TradeCardProps, 'onChangeTab'>

// i.e all the routes that Trade.tsx handles
const initialEntries = [
  TradeRoutePaths.Input,
  TradeRoutePaths.Confirm,
  TradeRoutePaths.VerifyAddresses,
  TradeRoutePaths.QuoteList,
]

// A standalone version of the trade page routing as an HOC, without it being a page, and without leveraging top-level routes but rather
// wrapping trade routes with a MemoryRouter.
// This allows us to keep the logic the same as usual and don't add any more refactor to https://github.com/shapeshift/web/pull/8983
// We should prefer regular routing whenever possible or at least use `MemoryRouter`s with caution, but for the time being, this is a pragmatic solution
// to allow us to have our cake and eat it
export const StandaloneTrade: React.FC<StandaloneTradeProps> = props => {
  return (
    <MemoryRouter initialEntries={initialEntries} initialIndex={0}>
      <StandaloneTradeInner {...props} />
    </MemoryRouter>
  )
}

// Inner version to get access to the MemoryRouter's context, another day in react world
const StandaloneTradeInner: React.FC<StandaloneTradeProps> = props => {
  const history = useHistory()
  const location = useLocation()
  const methods = useForm({ mode: 'onChange' })

  const handleChangeTab = useCallback(
    (newTab: TradeInputTab) => {
      switch (newTab) {
        case TradeInputTab.Trade:
          history.push(TradeRoutePaths.Input)
          break
        case TradeInputTab.LimitOrder:
          history.push(LimitOrderRoutePaths.Input)
          break
        case TradeInputTab.Claim:
          history.push(ClaimRoutePaths.Select)
          break
        default:
          break
      }
    },
    [history],
  )

  return (
    <FormProvider {...methods}>
      <Switch location={location}>
        <Route key={TradeRoutePaths.Input} path={TradeRoutePaths.Input}>
          <MultiHopTrade {...props} onChangeTab={handleChangeTab} isStandalone />
        </Route>
      </Switch>
    </FormProvider>
  )
}
