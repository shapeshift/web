import { zapper } from 'state/apis/zapper/zapperApi'

// Zapper only for now, make this readOnly.endpoints.selectGetReadOnlyOpportunities
// smooosh multiple providers into one output as we support more
export const selectGetReadOnlyOpportunities = zapper.endpoints.getZapperAppsBalancesOutput.select()
