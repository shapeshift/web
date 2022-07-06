import { DefiActionButtons } from 'features/defi/components/DefiActionButtons'
import {
  DefiAction,
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { AnimatePresence } from 'framer-motion'
import { SlideTransition } from 'components/SlideTransition'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'

import { YearnDeposit } from './Deposit/YearnDeposit'
import { YearnWithdraw } from './Withdraw/YearnWithdraw'

export const YearnManager = () => {
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { modal } = query

  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      {modal === DefiAction.Overview && (
        <SlideTransition key={DefiAction.Overview}>
          <DefiActionButtons />
        </SlideTransition>
      )}
      {modal === DefiAction.Deposit && (
        <SlideTransition key={DefiAction.Deposit}>
          <YearnDeposit />
        </SlideTransition>
      )}
      {modal === DefiAction.Withdraw && (
        <SlideTransition key={DefiAction.Withdraw}>
          <YearnWithdraw />
        </SlideTransition>
      )}
    </AnimatePresence>
  )
}
