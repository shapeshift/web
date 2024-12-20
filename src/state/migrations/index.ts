import type { MigrationManifest } from 'redux-persist'

import { clearAssets } from './clearAssets'
import { clearLocalWallet } from './clearLocalWallet'
import { clearMarketData } from './clearMarketData'
import { clearNfts } from './clearNfts'
import { clearOpportunities } from './clearOpportunities'
import { clearPortfolio } from './clearPortfolio'
import { clearSnapshot } from './clearSnapshot'
import { clearTxHistory } from './clearTxHistory'

export const clearTxHistoryMigrations = {
  0: clearTxHistory,
} as unknown as Omit<MigrationManifest, '_persist'>

export const clearOpportunitiesMigrations = {
  0: clearOpportunities,
} as unknown as Omit<MigrationManifest, '_persist'>

export const clearPortfolioMigrations = {
  0: clearPortfolio,
  1: clearPortfolio,
} as unknown as Omit<MigrationManifest, '_persist'>

export const localWalletMigrations = {
  0: clearLocalWallet,
} as unknown as Omit<MigrationManifest, '_persist'>

export const clearNftsMigrations = {
  0: clearNfts,
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
} as unknown as Omit<MigrationManifest, '_persist'>

export const clearMarketDataMigrations = {
  0: clearMarketData,
} as unknown as Omit<MigrationManifest, '_persist'>

export const clearSnapshotMigrations = {
  0: clearSnapshot,
} as unknown as Omit<MigrationManifest, '_persist'>
