import { combineReducers } from '@reduxjs/toolkit'
import localforage from 'localforage'
import { persistReducer } from 'redux-persist'
import { swapperApi } from 'state/apis/swapper/swapperApi'

import { fiatRampApi } from './apis/fiatRamps/fiatRamps'
import { foxyApi } from './apis/foxy/foxyApi'
import { assetApi, assets } from './slices/assetsSlice/assetsSlice'
import { foxEth, foxEthApi } from './slices/foxEthSlice/foxEthSlice'
import { marketApi, marketData } from './slices/marketDataSlice/marketDataSlice'
import { opportunities, opportunitiesApi } from './slices/opportunitiesSlice/opportunitiesSlice'
import { portfolio, portfolioApi } from './slices/portfolioSlice/portfolioSlice'
import { preferences } from './slices/preferencesSlice/preferencesSlice'
import { txHistory, txHistoryApi } from './slices/txHistorySlice/txHistorySlice'
import { validatorData, validatorDataApi } from './slices/validatorDataSlice/validatorDataSlice'

export const slices = {
  assets,
  marketData,
  txHistory,
  validatorData,
  portfolio,
  preferences,
  foxEth,
}

const preferencesPersistConfig = {
  key: 'preferences',
  storage: localforage,
  blacklist: ['featureFlags'],
}

export const sliceReducers = {
  assets: assets.reducer,
  marketData: marketData.reducer,
  txHistory: txHistory.reducer,
  portfolio: portfolio.reducer,
  preferences: persistReducer(preferencesPersistConfig, preferences.reducer),
  validatorData: validatorData.reducer,
  swapperApi: swapperApi.reducer,
  foxEth: foxEth.reducer,
  opportunities: opportunities.reducer,
}

export const apiSlices = {
  assetApi,
  portfolioApi,
  marketApi,
  txHistoryApi,
  validatorDataApi,
  fiatRampApi,
  foxEthApi,
  opportunitiesApi,
}

export const apiReducers = {
  [assetApi.reducerPath]: assetApi.reducer,
  [portfolioApi.reducerPath]: portfolioApi.reducer,
  [marketApi.reducerPath]: marketApi.reducer,
  [txHistoryApi.reducerPath]: txHistoryApi.reducer,
  [validatorDataApi.reducerPath]: validatorDataApi.reducer,
  [swapperApi.reducerPath]: swapperApi.reducer,
  [foxyApi.reducerPath]: foxyApi.reducer,
  [fiatRampApi.reducerPath]: fiatRampApi.reducer,
  [foxEthApi.reducerPath]: foxEthApi.reducer,
  [opportunitiesApi.reducerPath]: opportunitiesApi.reducer,
}

export const reducer = combineReducers({ ...sliceReducers, ...apiReducers })
export type ReduxState = ReturnType<typeof reducer>
