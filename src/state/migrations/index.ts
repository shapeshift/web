import type { MigrationManifest } from 'redux-persist'

import { clearAction } from './clearAction'
import { clearAddressBook } from './clearAddressBook'
import { clearAssets } from './clearAssets'
import { clearClaimActions } from './clearClaimActions'
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
  4: clearTxHistory,
  5: clearTxHistory,
  6: clearTxHistory,
  7: clearTxHistory,
  8: clearTxHistory,
} as unknown as Omit<MigrationManifest, '_persist'>

export const clearOpportunitiesMigrations = {
  0: clearOpportunities,
  1: clearOpportunities,
  2: clearOpportunities,
  3: clearOpportunities,
  4: clearOpportunities,
  5: clearOpportunities,
  6: clearOpportunities,
  7: clearOpportunities,
} as unknown as Omit<MigrationManifest, '_persist'>

export const clearPortfolioMigrations = {
  0: clearPortfolio,
  1: clearPortfolio,
  2: clearPortfolio,
  3: clearPortfolio,
  4: clearPortfolio,
  5: clearPortfolio,
  6: clearPortfolio,
} as unknown as Omit<MigrationManifest, '_persist'>

export const localWalletMigrations = {
  0: clearLocalWallet,
  1: clearLocalWallet,
} as unknown as Omit<MigrationManifest, '_persist'>

export const clearAssetsMigrations = {
  365: clearAssets,
} as unknown as Omit<MigrationManifest, '_persist'>

export const clearMarketDataMigrations = {
  0: clearMarketData,
  1: clearMarketData,
} as unknown as Omit<MigrationManifest, '_persist'>

export const clearSnapshotMigrations = {
  0: clearSnapshot,
} as unknown as Omit<MigrationManifest, '_persist'>

export const clearActionMigrations = {
  0: clearAction,
  1: clearAction,
  // Swaps persisted with the pre-swapperMetadata shape were cleared - drop the orphaned actions too
  2: clearAction,
  3: clearClaimActions,
} as unknown as Omit<MigrationManifest, '_persist'>

export const clearSwapsMigrations = {
  0: clearSwaps,
  // Swap.metadata moved to the swapperMetadata union - clear swaps persisted with the old shape
  1: clearSwaps,
} as unknown as Omit<MigrationManifest, '_persist'>

export const clearAddressBookMigrations = {
  0: clearAddressBook,
} as unknown as Omit<MigrationManifest, '_persist'>
