import { combineReducers } from '@reduxjs/toolkit'
import localforage from 'localforage'
import { createMigrate, persistReducer } from 'redux-persist'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'

import { abiApi } from './apis/abi/abiApi'
import { covalentApi } from './apis/covalent/covalentApi'
import { fiatRampApi } from './apis/fiatRamps/fiatRamps'
import { foxyApi } from './apis/foxy/foxyApi'
import type { NftState } from './apis/nft/nftApi'
import { nft, nftApi } from './apis/nft/nftApi'
import type { SnapshotState } from './apis/snapshot/snapshot'
import { snapshot, snapshotApi } from './apis/snapshot/snapshot'
import { swapperApi } from './apis/swapper/swapperApi'
import { zapper, zapperApi } from './apis/zapper/zapperApi'
import {
  clearAssetsMigrations,
  clearMarketDataMigrations,
  clearNftsMigrations,
  clearOpportunitiesMigrations,
  clearPortfolioMigrations,
  clearSnapshotMigrations,
  clearTxHistoryMigrations,
  localWalletMigrations,
} from './migrations'
import type { AssetsState } from './slices/assetsSlice/assetsSlice'
import { assetApi, assets } from './slices/assetsSlice/assetsSlice'
import type { LocalWalletState } from './slices/localWalletSlice/localWalletSlice'
import { localWalletSlice } from './slices/localWalletSlice/localWalletSlice'
import { marketApi, marketData } from './slices/marketDataSlice/marketDataSlice'
import type { MarketDataState } from './slices/marketDataSlice/types'
import { opportunitiesApi } from './slices/opportunitiesSlice/opportunitiesApiSlice'
import { opportunities } from './slices/opportunitiesSlice/opportunitiesSlice'
import type { OpportunitiesState } from './slices/opportunitiesSlice/types'
import { portfolio, portfolioApi } from './slices/portfolioSlice/portfolioSlice'
import type { Portfolio } from './slices/portfolioSlice/portfolioSliceCommon'
import type { Preferences } from './slices/preferencesSlice/preferencesSlice'
import { preferences } from './slices/preferencesSlice/preferencesSlice'
import { tradeInput } from './slices/tradeInputSlice/tradeInputSlice'
import type { TxHistory } from './slices/txHistorySlice/txHistorySlice'
import { txHistory, txHistoryApi } from './slices/txHistorySlice/txHistorySlice'

export const slices = {
  assets,
  marketData,
  txHistory,
  portfolio,
  preferences,
  opportunities,
  nft,
  tradeInput,
  tradeQuoteSlice,
  snapshot,
  localWalletSlice,
}

const preferencesPersistConfig = {
  key: 'preferences',
  storage: localforage,
  blacklist: ['featureFlags'],
}

const txHistoryPersistConfig = {
  key: 'txHistory',
  storage: localforage,
  version: Math.max(...Object.keys(clearTxHistoryMigrations).map(Number)),
  migrate: createMigrate(clearTxHistoryMigrations, { debug: false }),
}

const portfolioPersistConfig = {
  key: 'portfolio',
  storage: localforage,
  version: Math.max(...Object.keys(clearPortfolioMigrations).map(Number)),
  migrate: createMigrate(clearPortfolioMigrations, { debug: false }),
}

const opportunitiesPersistConfig = {
  key: 'opportunities',
  storage: localforage,
  version: Math.max(...Object.keys(clearOpportunitiesMigrations).map(Number)),
  migrate: createMigrate(clearOpportunitiesMigrations, { debug: false }),
}

const nftPersistConfig = {
  key: 'nft',
  storage: localforage,
  version: Math.max(...Object.keys(clearNftsMigrations).map(Number)),
  migrate: createMigrate(clearNftsMigrations, { debug: false }),
}

const snapshotPersistConfig = {
  key: 'snapshot',
  storage: localforage,
  version: Math.max(...Object.keys(clearSnapshotMigrations).map(Number)),
  migrate: createMigrate(clearSnapshotMigrations, { debug: false }),
}

const localWalletSlicePersistConfig = {
  key: 'localWalletSlice',
  storage: localforage,
  version: Math.max(...Object.keys(localWalletMigrations).map(Number)),
  migrate: createMigrate(localWalletMigrations, { debug: false }),
}

const marketDataPersistConfig = {
  key: 'marketData',
  storage: localforage,
  version: Math.max(...Object.keys(clearMarketDataMigrations).map(Number)),
  migrate: createMigrate(clearMarketDataMigrations, { debug: false }),
}

const assetsPersistConfig = {
  key: 'assets',
  storage: localforage,
  version: Math.max(...Object.keys(clearAssetsMigrations).map(Number)),
  migrate: createMigrate(clearAssetsMigrations, { debug: false }),
}

export const sliceReducers = {
  assets: persistReducer<AssetsState>(assetsPersistConfig, assets.reducer),
  marketData: persistReducer<MarketDataState>(marketDataPersistConfig, marketData.reducer),
  txHistory: persistReducer<TxHistory>(txHistoryPersistConfig, txHistory.reducer),
  portfolio: persistReducer<Portfolio>(portfolioPersistConfig, portfolio.reducer),
  preferences: persistReducer<Preferences>(preferencesPersistConfig, preferences.reducer),
  tradeInput: tradeInput.reducer,
  opportunities: persistReducer<OpportunitiesState>(
    opportunitiesPersistConfig,
    opportunities.reducer,
  ),
  nft: persistReducer<NftState>(nftPersistConfig, nft.reducer),
  tradeQuoteSlice: tradeQuoteSlice.reducer,
  snapshot: persistReducer<SnapshotState>(snapshotPersistConfig, snapshot.reducer),
  localWalletSlice: persistReducer<LocalWalletState>(
    localWalletSlicePersistConfig,
    localWalletSlice.reducer,
  ),
}

export const apiSlices = {
  assetApi,
  portfolioApi,
  marketApi,
  txHistoryApi,
  swappersApi: swapperApi,
  foxyApi,
  fiatRampApi,
  snapshotApi,
  zapper,
  zapperApi,
  nftApi,
  covalentApi,
  opportunitiesApi,
  abiApi,
}

export const apiReducers = {
  [assetApi.reducerPath]: assetApi.reducer,
  [portfolioApi.reducerPath]: portfolioApi.reducer,
  [marketApi.reducerPath]: marketApi.reducer,
  [txHistoryApi.reducerPath]: txHistoryApi.reducer,
  [swapperApi.reducerPath]: swapperApi.reducer,
  [foxyApi.reducerPath]: foxyApi.reducer,
  [fiatRampApi.reducerPath]: fiatRampApi.reducer,
  [snapshotApi.reducerPath]: snapshotApi.reducer,
  [zapperApi.reducerPath]: zapperApi.reducer,
  [nftApi.reducerPath]: nftApi.reducer,
  [covalentApi.reducerPath]: covalentApi.reducer,
  [zapper.reducerPath]: zapper.reducer,
  [opportunitiesApi.reducerPath]: opportunitiesApi.reducer,
  [abiApi.reducerPath]: abiApi.reducer,
}

export const reducer = combineReducers(Object.assign({}, sliceReducers, apiReducers))
export type ReduxState = ReturnType<typeof reducer>
