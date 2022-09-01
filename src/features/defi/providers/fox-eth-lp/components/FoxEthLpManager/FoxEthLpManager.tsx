import {
  DefiAction,
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { AnimatePresence } from 'framer-motion'
import { SlideTransition } from 'components/SlideTransition'
import { useFoxEth } from 'context/FoxEthProvider/FoxEthProvider'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'

import { FoxEthLpDeposit } from './Deposit/FoxEthLpDeposit'
import { FoxEthLpOverview } from './Overview/FoxEthLpOverview'
import { FoxEthLpWithdraw } from './Withdraw/FoxEthLpWithdraw'

export const FoxEthLpManager = () => {
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { modal } = query
  const { accountId, setAccountId } = useFoxEth()

  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      {modal === DefiAction.Overview && (
        <SlideTransition key={DefiAction.Overview}>
          <FoxEthLpOverview onAccountChange={setAccountId} />
        </SlideTransition>
      )}
      {modal === DefiAction.Deposit && (
        <SlideTransition key={DefiAction.Deposit}>
          <FoxEthLpDeposit />
        </SlideTransition>
      )}
      {modal === DefiAction.Withdraw && (
        <SlideTransition key={DefiAction.Withdraw}>
          <FoxEthLpWithdraw />
        </SlideTransition>
      )}
    </AnimatePresence>
  )
}
