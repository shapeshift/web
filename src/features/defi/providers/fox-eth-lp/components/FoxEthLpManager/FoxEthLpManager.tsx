import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
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
  const { accountId, setAccountId: handleAccountIdChange } = useFoxEth()

  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      {modal === DefiAction.Overview && (
        <SlideTransition key={DefiAction.Overview}>
          <FoxEthLpOverview accountId={accountId} onAccountIdChange={handleAccountIdChange} />
        </SlideTransition>
      )}
      {modal === DefiAction.Deposit && (
        <SlideTransition key={DefiAction.Deposit}>
          <FoxEthLpDeposit accountId={accountId} onAccountIdChange={handleAccountIdChange} />
        </SlideTransition>
      )}
      {modal === DefiAction.Withdraw && (
        <SlideTransition key={DefiAction.Withdraw}>
          <FoxEthLpWithdraw accountId={accountId} onAccountIdChange={handleAccountIdChange} />
        </SlideTransition>
      )}
    </AnimatePresence>
  )
}
