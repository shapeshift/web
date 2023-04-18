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

import { UniV2Deposit } from './Deposit/UniV2Deposit'
import { UniV2Overview } from './Overview/UniV2Overview'
import { UniV2Withdraw } from './Withdraw/UniV2Withdraw'

export const UniV2LpManager = () => {
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { modal } = query
  const [lpAccountId, setLpAccountId] = useState<AccountId | undefined>()

  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      {modal === DefiAction.Overview && (
        <SlideTransition key={DefiAction.Overview}>
          <UniV2Overview accountId={lpAccountId} onAccountIdChange={setLpAccountId} />
        </SlideTransition>
      )}
      {modal === DefiAction.Deposit && (
        <SlideTransition key={DefiAction.Deposit}>
          <UniV2Deposit accountId={lpAccountId} onAccountIdChange={setLpAccountId} />
        </SlideTransition>
      )}
      {modal === DefiAction.Withdraw && (
        <SlideTransition key={DefiAction.Withdraw}>
          <UniV2Withdraw accountId={lpAccountId} onAccountIdChange={setLpAccountId} />
        </SlideTransition>
      )}
    </AnimatePresence>
  )
}
