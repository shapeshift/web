import { IdleClaim } from './Claim/IdleClaim'
import { AnimatePresence } from 'framer-motion'
import { IdleDeposit } from './Deposit/IdleDeposit'
import { IdleOverview } from './Overview/IdleOverview'
import { IdleWithdraw } from './Withdraw/IdleWithdraw'
import { SlideTransition } from 'components/SlideTransition'
import {
  DefiAction,
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'


export const IdleManager = () => {
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { modal } = query

  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      {modal === DefiAction.Overview && (
        <SlideTransition key={DefiAction.Overview}>
          <IdleOverview />
        </SlideTransition>
      )}
      {modal === DefiAction.Deposit && (
        <SlideTransition key={DefiAction.Deposit}>
          <IdleDeposit />
        </SlideTransition>
      )}
      {modal === DefiAction.Withdraw && (
        <SlideTransition key={DefiAction.Withdraw}>
          <IdleWithdraw />
        </SlideTransition>
      )}
      {modal === DefiAction.Claim && (
        <SlideTransition key={DefiAction.Claim}>
          <IdleClaim />
        </SlideTransition>
      )}
    </AnimatePresence>
  )
}
