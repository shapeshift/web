import type { MigrationManifest } from 'redux-persist'

import { clearAssets } from './clearAssets'

export const clearTxHistoryMigrations = {
  // Uncomment me when introducing the first migration for this slice
  // 0: clearTxHistory,
} as unknown as Omit<MigrationManifest, '_persist'>

export const clearOpportunitiesMigrations = {
  // Uncomment me when introducing the first migration for this slice
  // 0: clearOpportunities,
} as unknown as Omit<MigrationManifest, '_persist'>

export const clearPortfolioMigrations = {
  // Uncomment me when introducing the first migration for this slice
  // 0: clearPortfolio,
} as unknown as Omit<MigrationManifest, '_persist'>

export const clearNftsMigrations = {
  // Uncomment me when introducing the first migration for this slice
  // 0: clearNfts,
} as unknown as Omit<MigrationManifest, '_persist'>

export const clearAssetsMigrations = {
  0: clearAssets,
} as unknown as Omit<MigrationManifest, '_persist'>

export const clearMarketDataMigrations = {
  // Uncomment me when introducing the first migration for this slice
  // 0: clearMarketData,
} as unknown as Omit<MigrationManifest, '_persist'>

export const clearSnapshotMigrations = {
  // Uncomment me when introducing the first migration for this slice
  // 0: clearSnapshot,
} as unknown as Omit<MigrationManifest, '_persist'>
