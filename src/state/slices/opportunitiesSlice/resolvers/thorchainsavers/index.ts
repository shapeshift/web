import { adapters } from '@shapeshiftoss/caip'
import type { ThornodePoolResponse } from '@shapeshiftoss/swapper'
import axios from 'axios'
import { getConfig } from 'config'
import { bnOrZero } from 'lib/bignumber/bignumber'

import type { GetOpportunityIdsOutput, OpportunityId, StakingId } from '../../types'

export const thorchainSaversOpportunityIdsResolver = async (): Promise<{
  data: GetOpportunityIdsOutput
}> => {
  const { data: opportunitiesData } = await axios.get<ThornodePoolResponse[]>(
    `${getConfig().REACT_APP_THORCHAIN_NODE_URL}/lcd/thorchain/pools`,
  )

  if (!opportunitiesData) return { data: [] }

  const opportunityIds = opportunitiesData.reduce<OpportunityId[]>((acc, currentOpportunity) => {
    const maybeOpportunityId = adapters.poolAssetIdToAssetId(currentOpportunity.asset)

    if (bnOrZero(currentOpportunity.savers_depth).gt(0) && maybeOpportunityId && currentOpportunity.status === 'Available') {
      acc.push(maybeOpportunityId as StakingId)
    }

    return acc
  }, [])

  return {
    data: opportunityIds,
  }
}
