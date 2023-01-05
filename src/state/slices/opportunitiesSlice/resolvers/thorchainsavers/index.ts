import type { ThornodePoolResponse } from '@shapeshiftoss/swapper'
import axios from 'axios'
import { getConfig } from 'config'
import { DefiProvider } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { bnOrZero } from 'lib/bignumber/bignumber'

import type { GetOpportunityIdsOutput } from '../../types'

export const thorchainSaversOpportunityIdsResolver = async (): Promise<{
  data: GetOpportunityIdsOutput
}> => {
  const { data: opportunitiesData } = await axios.get<ThornodePoolResponse[]>(
    `${getConfig().REACT_APP_THORCHAIN_NODE_URL}/lcd/thorchain/pools`,
  )

  if (!opportunitiesData) return { data: [] }

  const opportunityIds = opportunitiesData
    .filter(opportunity => bnOrZero(opportunity.savers_depth).gt(0))
    .map(opportunity => `${DefiProvider.ThorchainSavers}::${opportunity.asset}`)

  return {
    data: opportunityIds,
  }
}
