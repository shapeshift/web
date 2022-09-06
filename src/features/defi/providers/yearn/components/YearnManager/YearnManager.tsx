import { AccountId } from '@shapeshiftoss/caip'
import {
  DefiAction,
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { SlideTransition } from 'components/SlideTransition'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'

import { YearnDeposit } from './Deposit/YearnDeposit'
import { YearnOverview } from './Overview/YearnOverview'
import { YearnWithdraw } from './Withdraw/YearnWithdraw'

export const YearnManager = () => {
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { modal } = query
  const [accountId, setAccountId] = useState<AccountId | null>(null)

  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      {modal === DefiAction.Overview && (
        <SlideTransition key={DefiAction.Overview}>
          <YearnOverview onAccountChange={setAccountId} />
        </SlideTransition>
      )}
      {modal === DefiAction.Deposit && (
        <SlideTransition key={DefiAction.Deposit}>
          <YearnDeposit onAccountChange={setAccountId} accountId={accountId} />
        </SlideTransition>
      )}
      {modal === DefiAction.Withdraw && (
        <SlideTransition key={DefiAction.Withdraw}>
          <YearnWithdraw onAccountChange={setAccountId} accountId={accountId} />
        </SlideTransition>
      )}
    </AnimatePresence>
  )
}
