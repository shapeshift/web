import type { AccountId } from '@shapeshiftoss/caip'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { SlideTransition } from 'components/SlideTransition'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'

import { OsmosisDeposit } from './Deposit/OsmosisDeposit'
import { OsmosisOverview } from './Overview/OsmosisOverview'
import { OsmosisWithdraw } from './Withdraw/OsmosisWithdraw'

export const OsmosisManager = () => {
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { modal } = query
  const [accountId, setAccountId] = useState<AccountId | undefined>()

  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      {modal === DefiAction.Overview && (
        <SlideTransition key={DefiAction.Overview}>
          <OsmosisOverview accountId={accountId} onAccountIdChange={setAccountId} />
        </SlideTransition>
      )}
      {modal === DefiAction.Deposit && (
        <SlideTransition key={DefiAction.Deposit}>
          <OsmosisDeposit accountId={accountId} onAccountIdChange={setAccountId} />
        </SlideTransition>
      )}
      {modal === DefiAction.Withdraw && (
        <SlideTransition key={DefiAction.Withdraw}>
          <OsmosisWithdraw accountId={accountId} onAccountIdChange={setAccountId} />
        </SlideTransition>
      )}
    </AnimatePresence>
  )
}
