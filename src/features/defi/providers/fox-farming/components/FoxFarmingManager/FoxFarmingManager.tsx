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

import { Claim } from './Claim/Claim'
import { FoxFarmingDeposit } from './Deposit/FoxFarmingDeposit'
import { FoxFarmingOverview } from './Overview/FoxFarmingOverview'
import { FoxFarmingWithdraw } from './Withdraw/FoxFarmingWithdraw'

export const FoxFarmingManager = () => {
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { modal } = query
  const { farmingAccountId, setFarmingAccountId: handleFarmingAccountIdChange } = useFoxEth()

  useEffect(() => {
    if (!query.accountId) return

    handleFarmingAccountIdChange(query.accountId)
  }, [query.accountId, handleFarmingAccountIdChange])

  // farmingAccountId isn't a local state field - it is a memoized state field from the <FoxEthContext /> and will stay hanging
  // This makes sure to clear it on modal close
  useEffect(() => {
    return () => {
      handleFarmingAccountIdChange(undefined)
    }
  }, [handleFarmingAccountIdChange])

  return (
    <AnimatePresence mode='wait' initial={false}>
      {modal === DefiAction.Overview && (
        <SlideTransition key={DefiAction.Overview}>
          <FoxFarmingOverview
            accountId={farmingAccountId}
            onAccountIdChange={handleFarmingAccountIdChange}
          />
        </SlideTransition>
      )}
      {modal === DefiAction.Deposit && (
        <SlideTransition key={DefiAction.Deposit}>
          <FoxFarmingDeposit
            accountId={farmingAccountId}
            onAccountIdChange={handleFarmingAccountIdChange}
          />
        </SlideTransition>
      )}
      {modal === DefiAction.Withdraw && (
        <SlideTransition key={DefiAction.Withdraw}>
          <FoxFarmingWithdraw
            accountId={farmingAccountId}
            onAccountIdChange={handleFarmingAccountIdChange}
          />
        </SlideTransition>
      )}
      {modal === DefiAction.Claim && (
        <SlideTransition key={DefiAction.Claim}>
          <Claim accountId={farmingAccountId} onAccountIdChange={handleFarmingAccountIdChange} />
        </SlideTransition>
      )}
    </AnimatePresence>
  )
}
