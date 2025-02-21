import type { AccountId } from '@shapeshiftmonorepo/caip'
import { AnimatePresence } from 'framer-motion'
import { useState } from 'react'

import { FoxyDeposit } from './Deposit/FoxyDeposit'
import { FoxyClaim } from './Overview/Claim/Claim'
import { FoxyOverview } from './Overview/FoxyOverview'
import { FoxyWithdraw } from './Withdraw/FoxyWithdraw'

import { SlideTransition } from '@/components/SlideTransition'
import type {
  DefiParams,
  DefiQueryParams,
} from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction } from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useBrowserRouter } from '@/hooks/useBrowserRouter/useBrowserRouter'

export const FoxyManager = () => {
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { modal } = query
  const [accountId, setAccountId] = useState<AccountId | undefined>()

  return (
    <AnimatePresence mode='wait' initial={false}>
      {modal === DefiAction.Overview && (
        <SlideTransition key={DefiAction.Overview}>
          <FoxyOverview onAccountIdChange={setAccountId} accountId={accountId} />
        </SlideTransition>
      )}
      {modal === DefiAction.Deposit && (
        <SlideTransition key={DefiAction.Deposit}>
          <FoxyDeposit onAccountIdChange={setAccountId} accountId={accountId} />
        </SlideTransition>
      )}
      {modal === DefiAction.Withdraw && (
        <SlideTransition key={DefiAction.Withdraw}>
          <FoxyWithdraw onAccountIdChange={setAccountId} accountId={accountId} />
        </SlideTransition>
      )}
      {modal === DefiAction.Claim && (
        <SlideTransition key={DefiAction.Claim}>
          <FoxyClaim accountId={accountId} />
        </SlideTransition>
      )}
    </AnimatePresence>
  )
}
