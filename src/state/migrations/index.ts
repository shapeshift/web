import type { MigrationManifest } from 'redux-persist'

import { clearAssets } from './clearAssets'
import { clearLocalWallet } from './clearLocalWallet'
import { clearMarketData } from './clearMarketData'
import { clearOpportunities } from './clearOpportunities'
import { clearPortfolio } from './clearPortfolio'
import { clearSnapshot } from './clearSnapshot'
import { clearSwaps } from './clearSwaps'
import { clearTxHistory } from './clearTxHistory'
export const clearTxHistoryMigrations = {
  0: clearTxHistory,
  1: clearTxHistory,
  2: clearTxHistory,
  3: clearTxHistory,
} as unknown as Omit<MigrationManifest, '_persist'>

export const clearOpportunitiesMigrations = {
  0: clearOpportunities,
  1: clearOpportunities,
  2: clearOpportunities,
  3: clearOpportunities,
  4: clearOpportunities,
} as unknown as Omit<MigrationManifest, '_persist'>

export const clearPortfolioMigrations = {
  0: clearPortfolio,
  1: clearPortfolio,
  2: clearPortfolio,
} as unknown as Omit<MigrationManifest, '_persist'>

export const localWalletMigrations = {
  0: clearLocalWallet,
  1: clearLocalWallet,
} as unknown as Omit<MigrationManifest, '_persist'>

export const clearAssetsMigrations = {
  0: clearAssets,
  1: clearAssets,
  2: clearAssets,
  3: clearAssets,
  4: clearAssets,
  5: clearAssets,
  6: clearAssets,
  7: clearAssets,
  8: clearAssets,
  9: clearAssets,
  10: clearAssets,
  11: clearAssets,
  12: clearAssets,
  13: clearAssets,
  14: clearAssets,
  15: clearAssets,
  16: clearAssets,
  17: clearAssets,
  18: clearAssets,
  19: clearAssets,
  20: clearAssets,
  21: clearAssets,
  22: clearAssets,
  23: clearAssets,
  24: clearAssets,
  25: clearAssets,
  26: clearAssets,
  27: clearAssets,
  28: clearAssets,
  29: clearAssets,
  30: clearAssets,
  31: clearAssets,
  32: clearAssets,
  33: clearAssets,
  34: clearAssets,
  35: clearAssets,
  36: clearAssets,
  37: clearAssets,
  38: clearAssets,
  39: clearAssets,
  40: clearAssets,
  41: clearAssets,
  42: clearAssets,
  43: clearAssets,
  44: clearAssets,
  45: clearAssets,
  46: clearAssets,
  47: clearAssets,
  48: clearAssets,
  49: clearAssets,
  50: clearAssets,
  51: clearAssets,
  52: clearAssets,
  53: clearAssets,
  54: clearAssets,
  55: clearAssets,
  56: clearAssets,
  57: clearAssets,
  58: clearAssets,
  59: clearAssets,
  60: clearAssets,
  61: clearAssets,
  62: clearAssets,
  63: clearAssets,
  64: clearAssets,
  65: clearAssets,
  66: clearAssets,
  67: clearAssets,
  68: clearAssets,
  69: clearAssets,
  70: clearAssets,
  71: clearAssets,
  72: clearAssets,
  73: clearAssets,
  74: clearAssets,
  75: clearAssets,
  76: clearAssets,
  77: clearAssets,
  78: clearAssets,
  79: clearAssets,
  80: clearAssets,
  81: clearAssets,
  82: clearAssets,
  83: clearAssets,
  84: clearAssets,
  85: clearAssets,
  86: clearAssets,
  87: clearAssets,
  88: clearAssets,
  89: clearAssets,
  90: clearAssets,
  91: clearAssets,
  92: clearAssets,
  93: clearAssets,
  94: clearAssets,
  95: clearAssets,
  96: clearAssets,
  97: clearAssets,
  98: clearAssets,
  99: clearAssets,
  100: clearAssets,
  101: clearAssets,
  102: clearAssets,
} as unknown as Omit<MigrationManifest, '_persist'>

export const clearMarketDataMigrations = {
  0: clearMarketData,
  1: clearMarketData,
} as unknown as Omit<MigrationManifest, '_persist'>

export const clearSnapshotMigrations = {
  0: clearSnapshot,
} as unknown as Omit<MigrationManifest, '_persist'>

export const clearSwapsMigrations = {
  0: clearSwaps,
} as unknown as Omit<MigrationManifest, '_persist'>
