import type { AccountId } from '@keepkey/caip'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { SlideTransition } from 'components/SlideTransition'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import type { Nullable } from 'types/common'

import { CosmosClaim } from './Claim/CosmosClaim'
import { CosmosDeposit } from './Deposit/CosmosDeposit'
import { CosmosLearnMore } from './LearnMore/CosmosLearnMore'
import { CosmosOverview } from './Overview/CosmosOverview'
import { CosmosWithdraw } from './Withdraw/CosmosWithdraw'

export const CosmosManager = () => {
  const { query, history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { modal } = query
  const [accountId, setAccountId] = useState<Nullable<AccountId>>(null)

  const handleCancel = () => {
    browserHistory.goBack()
  }

  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      {modal === DefiAction.GetStarted && (
        <SlideTransition key={DefiAction.Overview}>
          <CosmosLearnMore onClose={handleCancel} />
        </SlideTransition>
      )}

      {modal === DefiAction.Overview && (
        <SlideTransition key={DefiAction.Overview}>
          <CosmosOverview accountId={accountId} onAccountIdChange={setAccountId} />
        </SlideTransition>
      )}
      {modal === DefiAction.Deposit && (
        <SlideTransition key={DefiAction.Deposit}>
          <CosmosDeposit onAccountIdChange={setAccountId} accountId={accountId} />
        </SlideTransition>
      )}
      {modal === DefiAction.Withdraw && (
        <SlideTransition key={DefiAction.Withdraw}>
          <CosmosWithdraw onAccountIdChange={setAccountId} accountId={accountId} />
        </SlideTransition>
      )}
      {modal === DefiAction.Claim && (
        <SlideTransition key={DefiAction.Claim}>
          <CosmosClaim accountId={accountId} />
        </SlideTransition>
      )}
    </AnimatePresence>
  )
}
