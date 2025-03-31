import type { AccountId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { CosmosClaim } from './Claim/CosmosClaim'
import { CosmosDeposit } from './Deposit/CosmosDeposit'
import { CosmosLearnMore } from './LearnMore/CosmosLearnMore'
import { CosmosOverview } from './Overview/CosmosOverview'
import { CosmosWithdraw } from './Withdraw/CosmosWithdraw'

import { SlideTransition } from '@/components/SlideTransition'
import type {
  DefiParams,
  DefiQueryParams,
} from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction } from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useBrowserRouter } from '@/hooks/useBrowserRouter/useBrowserRouter'

export const CosmosManager = () => {
  const navigate = useNavigate()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { modal } = query
  const [accountId, setAccountId] = useState<AccountId | undefined>()

  const handleCancel = useCallback(() => {
    navigate(-1)
  }, [navigate])

  return (
    <AnimatePresence mode='wait' initial={false}>
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
          <CosmosClaim onAccountIdChange={setAccountId} accountId={accountId} />
        </SlideTransition>
      )}
    </AnimatePresence>
  )
}
