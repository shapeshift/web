import { clearOpportunitiesSlice } from './000_clear_opportunities_slice'
import { filterExpiredYearnOpportunities } from './001_filter_expired_yearn_opportunities'
import { filterRetiredYearnOpportunities } from './002_filter_retired_yearn_opportunities'
import { purgeOldIdleOpportunities } from './003_purge_old_idle_opportunities'
import { renameUnderlyingAssetRatios } from './004_opportunities_underlyingAssetRatios_underlyingAssetRatiosBaseUnit'
import { disableYearnOpportunities } from './005_disable_yearn_opportunities'
import { cosmosSdkOpportunitiesSliceAbstraction } from './006_opportunities_cosmos_abstraction'
import { clearWithdrawnSaversOpportunities } from './007_clear_withdrawn_savers_opportunities'
import { clearCosmosSdkOpportunities } from './008_clear_cosmos_sdk_opportunities'
import { splitUniV2EthFoxFarming } from './009_split_univ2_eth_fox_farming'
import { clearFoxFarming } from './010_clear_fox_farming'
import { clearIdleOpportunities } from './011_clear_idle_opportunities'
import { clearOpportunities } from './012_clear_opportunities'
import { clearOpportunitiesAgain } from './013_clear_opportunities'

export const migrations = {
  0: clearOpportunitiesSlice,
  1: filterExpiredYearnOpportunities,
  2: filterRetiredYearnOpportunities,
  3: purgeOldIdleOpportunities,
  4: renameUnderlyingAssetRatios,
  5: disableYearnOpportunities,
  6: cosmosSdkOpportunitiesSliceAbstraction,
  7: clearWithdrawnSaversOpportunities,
  8: clearCosmosSdkOpportunities,
  9: splitUniV2EthFoxFarming,
  10: clearFoxFarming,
  11: clearIdleOpportunities,
  12: clearOpportunities,
  13: clearOpportunitiesAgain,
  14: clearOpportunitiesAgain,
}
