import type { AccountId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import { useState } from 'react'

import { ThorchainSaversDeposit } from './Deposit/ThorchainSaversDeposit'
import { Dust } from './Dust/Dust'
import { ThorchainSaversOverview } from './Overview/ThorchainSaversOverview'
import { ThorchainSaversWithdraw } from './Withdraw/ThorchainSaversWithdraw'

import { SlideTransition } from '@/components/SlideTransition'
import type {
  DefiParams,
  DefiQueryParams,
} from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction } from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useBrowserRouter } from '@/hooks/useBrowserRouter/useBrowserRouter'

export const ThorchainSaversManager = () => {
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { modal } = query
  const [accountId, setAccountId] = useState<AccountId | undefined>()

  return (
    <AnimatePresence mode='wait' initial={false}>
      {modal === DefiAction.Overview && (
        <SlideTransition key={DefiAction.Overview}>
          <ThorchainSaversOverview accountId={accountId} onAccountIdChange={setAccountId} />
        </SlideTransition>
      )}
      {modal === DefiAction.Deposit && (
        <SlideTransition key={DefiAction.Deposit}>
          <ThorchainSaversDeposit accountId={accountId} onAccountIdChange={setAccountId} />
        </SlideTransition>
      )}
      {modal === DefiAction.Withdraw && (
        <SlideTransition key={DefiAction.Withdraw}>
          <ThorchainSaversWithdraw accountId={accountId} onAccountIdChange={setAccountId} />
        </SlideTransition>
      )}
      {modal === DefiAction.SendDust && (
        <SlideTransition key={DefiAction.SendDust}>
          <Dust accountId={accountId} onAccountIdChange={setAccountId} />
        </SlideTransition>
      )}
    </AnimatePresence>
  )
}
