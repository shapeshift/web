import type { AccountId } from '@shapeshiftoss/caip'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { SlideTransition } from 'components/SlideTransition'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'

import { OsmosisLpDeposit } from './Lp/Deposit/OsmosisLpDeposit'
import { OsmosisLpOverview } from './Lp/Overview/OsmosisLpOverview'
import { OsmosisLpWithdraw } from './Lp/Withdraw/OsmosisLpWithdraw'
import { OsmosisStakingClaim } from './Staking/Claim/OsmosisStakingClaim'
import { OsmosisStakingDeposit } from './Staking/Deposit/OsmosisStakingDeposit'
import { OsmosisStakingOverview } from './Staking/Overview/OsmosisStakingOverview'
import { OsmosisStakingWithdraw } from './Staking/Withdraw/OsmosisStakingWithdraw'

type SupportedDefiType = DefiType.LiquidityPool | DefiType.TokenStaking
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
  [DefiType.TokenStaking]: {
    [DefiAction.Claim]: OsmosisStakingClaim,
    [DefiAction.Deposit]: OsmosisStakingDeposit,
    [DefiAction.GetStarted]: OsmosisStakingOverview,
    [DefiAction.Overview]: OsmosisStakingOverview,
    [DefiAction.Withdraw]: OsmosisStakingWithdraw,
  },
}

const getComponentByTypeAndAction = (type: DefiType | string, action: DefiAction | string) => {
  return componentMapByTypeAndAction[type as SupportedDefiType][action as SupportedDefiAction]
}

export const OsmosisManager = () => {
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { modal: action, type } = query
  const [accountId, setAccountId] = useState<AccountId | undefined>()

  const renderContext = () => {
    const ComponentToRender = getComponentByTypeAndAction(type, action)

    return ComponentToRender ? (
      <>
        <AnimatePresence exitBeforeEnter initial={false}>
          <SlideTransition key={action}>
            <ComponentToRender accountId={accountId} onAccountIdChange={setAccountId} />
          </SlideTransition>
        </AnimatePresence>
      </>
    ) : null
  }

  return <>{renderContext()}</>
}
