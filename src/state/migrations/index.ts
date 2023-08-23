import { clearOpportunities } from './clearOpportunities'
import { clearPortfolio } from './clearPortfolio'

// when adding a migration, dont forget to increment `persistConfig.version` in `src/state/store.js`
export const migrations = {
  0: clearOpportunities,
  1: clearOpportunities,
  2: clearPortfolio,
  3: clearOpportunities,
}
