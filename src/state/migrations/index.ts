import { clearAssets } from './clearAssets'
import { clearMarketData } from './clearMarketData'
import { clearNfts } from './clearNfts'
import { clearOpportunities } from './clearOpportunities'
import { clearPortfolio } from './clearPortfolio'
import { clearSnapshot } from './clearSnapshot'
import { clearTxHistory } from './clearTxHistory'

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
  9: clearAssets,
  10: clearTxHistory,
  11: clearAssets,
  12: clearAssets,
  13: clearPortfolio,
  14: clearTxHistory,
  15: clearAssets,
  16: clearOpportunities,
  17: clearTxHistory,
  18: clearTxHistory,
  19: clearMarketData,
  20: clearTxHistory,
  21: clearAssets,
  22: clearTxHistory,
  23: clearPortfolio,
  24: clearTxHistory,
  25: clearAssets,
  26: clearAssets,
  27: clearPortfolio,
  28: clearAssets,
  29: clearAssets,
  30: clearTxHistory,
  31: clearAssets,
  32: clearSnapshot,
  33: clearPortfolio,
}
