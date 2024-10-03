import type { MigrationManifest } from 'redux-persist'

import { clearAssets } from './clearAssets'
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
} as unknown as Omit<MigrationManifest, '_persist'>

export const clearNftsMigrations = {
  0: clearNfts,
} as unknown as Omit<MigrationManifest, '_persist'>

export const clearAssetsMigrations = {
  0: clearAssets,
  1: clearAssets,
  2: clearAssets,
} as unknown as Omit<MigrationManifest, '_persist'>

export const clearMarketDataMigrations = {
  0: clearMarketData,
} as unknown as Omit<MigrationManifest, '_persist'>

export const clearSnapshotMigrations = {
  0: clearSnapshot,
} as unknown as Omit<MigrationManifest, '_persist'>
