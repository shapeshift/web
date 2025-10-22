import { combineReducers } from '@reduxjs/toolkit'
import localforage from 'localforage'
import { createMigrate, persistReducer } from 'redux-persist'

import { abiApi } from './apis/abi/abiApi'
import { fiatRampApi } from './apis/fiatRamps/fiatRamps'
import { foxyApi } from './apis/foxy/foxyApi'
import { limitOrderApi } from './apis/limit-orders/limitOrderApi'
import { portalsApi } from './apis/portals/portalsApi'
import type { SnapshotState } from './apis/snapshot/snapshot'
import { snapshot, snapshotApi } from './apis/snapshot/snapshot'
import { swapperApi } from './apis/swapper/swapperApi'
import {
  clearActionMigrations,
  clearAddressBookMigrations,
  clearAssetsMigrations,
  clearMarketDataMigrations,
  clearOpportunitiesMigrations,
  clearPortfolioMigrations,
  clearSnapshotMigrations,
  clearSwapsMigrations,
  clearTxHistoryMigrations,
  localWalletMigrations,
} from './migrations'
import { actionSlice } from './slices/actionSlice/actionSlice'
import type { ActionState } from './slices/actionSlice/types'
import type { AddressBookState } from './slices/addressBookSlice/addressBookSlice'
import { addressBookSlice } from './slices/addressBookSlice/addressBookSlice'
import type { AssetsState } from './slices/assetsSlice/assetsSlice'
import { assetApi, assets } from './slices/assetsSlice/assetsSlice'
import { limitOrderInput } from './slices/limitOrderInputSlice/limitOrderInputSlice'
import { limitOrderSlice } from './slices/limitOrderSlice/limitOrderSlice'
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
import { swapSlice } from './slices/swapSlice/swapSlice'
import type { SwapState } from './slices/swapSlice/types'
import { tradeInput } from './slices/tradeInputSlice/tradeInputSlice'
import type { TxHistory } from './slices/txHistorySlice/txHistorySlice'
import { txHistory, txHistoryApi } from './slices/txHistorySlice/txHistorySlice'

import { tradeQuoteSlice } from '@/state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { tradeRampInput } from '@/state/slices/tradeRampInputSlice/tradeRampInputSlice'

export const slices = {
  assets,
  marketData,
  txHistory,
  portfolio,
  preferences,
  opportunities,
  tradeInput,
  limitOrderInput,
  tradeRampInput,
  tradeQuote: tradeQuoteSlice,
  limitOrder: limitOrderSlice,
  snapshot,
  localWallet: localWalletSlice,
  addressBook: addressBookSlice,
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

const snapshotPersistConfig = {
  key: 'snapshot',
  storage: localforage,
  version: Math.max(...Object.keys(clearSnapshotMigrations).map(Number)),
  migrate: createMigrate(clearSnapshotMigrations, { debug: false }),
}

const localWalletSlicePersistConfig = {
  key: 'localWallet',
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

const limitOrderApiPersistConfig = {
  key: 'limitOrderApi',
  storage: localforage,
  version: 0,
}

const actionPersistConfig = {
  key: 'action',
  storage: localforage,
  version: Math.max(...Object.keys(clearActionMigrations).map(Number)),
  migrate: createMigrate(clearActionMigrations, { debug: false }),
}

const swapPersistConfig = {
  key: 'swap',
  storage: localforage,
  version: Math.max(...Object.keys(clearSwapsMigrations).map(Number)),
}

const addressBookPersistConfig = {
  key: 'addressBook',
  storage: localforage,
  version: Math.max(...Object.keys(clearAddressBookMigrations).map(Number)),
  migrate: createMigrate(clearAddressBookMigrations, { debug: false }),
}

export const sliceReducers = {
  assets: persistReducer<AssetsState>(assetsPersistConfig, assets.reducer),
  marketData: persistReducer<MarketDataState>(marketDataPersistConfig, marketData.reducer),
  txHistory: persistReducer<TxHistory>(txHistoryPersistConfig, txHistory.reducer),
  portfolio: persistReducer<Portfolio>(portfolioPersistConfig, portfolio.reducer),
  preferences: persistReducer<Preferences>(preferencesPersistConfig, preferences.reducer),
  tradeInput: tradeInput.reducer,
  limitOrderInput: limitOrderInput.reducer,
  tradeRampInput: tradeRampInput.reducer,
  opportunities: persistReducer<OpportunitiesState>(
    opportunitiesPersistConfig,
    opportunities.reducer,
  ),
  tradeQuote: tradeQuoteSlice.reducer,
  limitOrder: limitOrderSlice.reducer,
  snapshot: persistReducer<SnapshotState>(snapshotPersistConfig, snapshot.reducer),
  localWallet: persistReducer<LocalWalletState>(
    localWalletSlicePersistConfig,
    localWalletSlice.reducer,
  ),
  action: persistReducer<ActionState>(actionPersistConfig, actionSlice.reducer),
  swap: persistReducer<SwapState>(swapPersistConfig, swapSlice.reducer),
  addressBook: persistReducer<AddressBookState>(addressBookPersistConfig, addressBookSlice.reducer),
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
  portalsApi,
  opportunitiesApi,
  abiApi,
  limitOrderApi,
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
  [portalsApi.reducerPath]: portalsApi.reducer,
  [opportunitiesApi.reducerPath]: opportunitiesApi.reducer,
  [abiApi.reducerPath]: abiApi.reducer,
  [limitOrderApi.reducerPath]: persistReducer(limitOrderApiPersistConfig, limitOrderApi.reducer),
}

export const reducer = combineReducers(Object.assign({}, sliceReducers, apiReducers))
export type ReduxState = ReturnType<typeof reducer>
