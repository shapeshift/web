import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'
import { SlideTransition } from 'components/SlideTransition'
import { useFoxEth } from 'context/FoxEthProvider/FoxEthProvider'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'

import { FoxEthLpDeposit } from './Deposit/FoxEthLpDeposit'
import { FoxEthLpOverview } from './Overview/FoxEthLpOverview'
import { FoxEthLpWithdraw } from './Withdraw/FoxEthLpWithdraw'

export const FoxEthLpManager = () => {
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { modal } = query
  const { lpAccountId, setLpAccountId: handleLpAccountIdChange } = useFoxEth()

  // lpAccountId isn't a local state field - it is a memoized state field from the <FoxEthContext /> and will stay hanging
  // This makes sure to clear it on modal close
  useEffect(() => {
    return () => {
      handleLpAccountIdChange(undefined)
    }
  })

  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      {modal === DefiAction.Overview && (
        <SlideTransition key={DefiAction.Overview}>
          <FoxEthLpOverview accountId={lpAccountId} onAccountIdChange={handleLpAccountIdChange} />
        </SlideTransition>
      )}
      {modal === DefiAction.Deposit && (
        <SlideTransition key={DefiAction.Deposit}>
          <FoxEthLpDeposit accountId={lpAccountId} onAccountIdChange={handleLpAccountIdChange} />
        </SlideTransition>
      )}
      {modal === DefiAction.Withdraw && (
        <SlideTransition key={DefiAction.Withdraw}>
          <FoxEthLpWithdraw accountId={lpAccountId} onAccountIdChange={handleLpAccountIdChange} />
        </SlideTransition>
      )}
    </AnimatePresence>
  )
}
