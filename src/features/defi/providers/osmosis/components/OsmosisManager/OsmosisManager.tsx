import type { AccountId } from '@shapeshiftoss/caip'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { AnimatePresence } from 'framer-motion'
import { useMemo, useState } from 'react'
import { SlideTransition } from 'components/SlideTransition'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { DefiType } from 'state/slices/opportunitiesSlice/types'

import { OsmosisLpDeposit } from './Lp/Deposit/OsmosisLpDeposit'
import { OsmosisLpOverview } from './Lp/Overview/OsmosisLpOverview'
import { OsmosisLpWithdraw } from './Lp/Withdraw/OsmosisLpWithdraw'

// TODO(gomes): Rename this whole domain. This is really `OsmosisLpManager`, there's nothing staking here
type SupportedDefiType = DefiType.LiquidityPool
type SupportedDefiAction = DefiAction.Overview | DefiAction.Deposit | DefiAction.Withdraw

/** TODO(pastaghost): Move component lookup logic below into a function or hook that accepts chainId, type, and action arguments.
 * this will allow the OsmosisManager and all other cosmos-sdk defi manager components to be replaced with a single generic DefiManager component instead.
 **/
const componentMapByTypeAndAction = {
  [DefiType.LiquidityPool]: {
    [DefiAction.Deposit]: OsmosisLpDeposit,
    [DefiAction.Overview]: OsmosisLpOverview,
    [DefiAction.Withdraw]: OsmosisLpWithdraw,
  },
}

const getComponentByTypeAndAction = (type: DefiType | string, action: DefiAction | string) => {
  if (type === DefiType.Staking) return // This should never be hit. We use CosmosManager for cosmos-sdk staking
  return componentMapByTypeAndAction[type as SupportedDefiType][action as SupportedDefiAction]
}

export const OsmosisManager = () => {
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { modal: action, type } = query
  const [accountId, setAccountId] = useState<AccountId | undefined>()
  const ComponentToRender = useMemo(() => getComponentByTypeAndAction(type, action), [type, action])

  if (!ComponentToRender) return null
  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      <SlideTransition key={action}>
        <ComponentToRender accountId={accountId} onAccountIdChange={setAccountId} />
      </SlideTransition>
    </AnimatePresence>
  )
}
