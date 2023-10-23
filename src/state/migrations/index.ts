import { clearAssets } from './clearAssets'
import { clearNfts } from './clearNfts'
import { clearOpportunities } from './clearOpportunities'
import { clearPortfolio } from './clearPortfolio'

export const migrations = {
  0: clearOpportunities,
  1: clearOpportunities,
  2: clearPortfolio,
  3: clearOpportunities,
  4: clearOpportunities,
  5: clearNfts,
  6: clearAssets,
  7: clearPortfolio,
  8: clearOpportunities,
}
