import { clearOpportunitiesSlice } from './000_clear_opportunities_slice'
import { filterExpiredYearnOpportunities } from './001_filter_expired_yearn_opportunities'
import { filterRetiredYearnOpportunities } from './002_filter_retired_yearn_opportunities'
import { purgeOldIdleOpportunities } from './003_purge_old_idle_opportunities'

export const migrations = {
  0: clearOpportunitiesSlice,
  1: filterExpiredYearnOpportunities,
  2: filterRetiredYearnOpportunities,
  3: purgeOldIdleOpportunities,
}
