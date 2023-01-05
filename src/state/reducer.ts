import { combineReducers } from '@reduxjs/toolkit'
import localforage from 'localforage'
import { persistReducer } from 'redux-persist'
import { getBestSwapperApi } from 'state/apis/swapper/getBestSwapperApi'
import { getTradeQuoteApi } from 'state/apis/swapper/getTradeQuoteApi'
import { getUsdRateApi } from 'state/apis/swapper/getUsdRateApi'
import { getUsdRatesApi } from 'state/apis/swapper/getUsdRatesApi'

import { fiatRampApi } from './apis/fiatRamps/fiatRamps'
import { foxyApi } from './apis/foxy/foxyApi'
import { assetApi, assets } from './slices/assetsSlice/assetsSlice'
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
  opportunities,
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
  getTradeQuoteApi: getTradeQuoteApi.reducer,
  getBestSwapperApi: getBestSwapperApi.reducer,
  getUsdRateApi: getUsdRateApi.reducer,
  getUsdRatesApi: getUsdRatesApi.reducer,
  opportunities: opportunities.reducer,
}

export const apiSlices = {
  assetApi,
  portfolioApi,
  marketApi,
  txHistoryApi,
  validatorDataApi,
  getTradeQuoteApi,
  getBestSwapperApi,
  getUsdRateApi,
  getUsdRatesApi,
  foxyApi,
  fiatRampApi,
  opportunitiesApi,
}

export const apiReducers = {
  [assetApi.reducerPath]: assetApi.reducer,
  [portfolioApi.reducerPath]: portfolioApi.reducer,
  [marketApi.reducerPath]: marketApi.reducer,
  [txHistoryApi.reducerPath]: txHistoryApi.reducer,
  [validatorDataApi.reducerPath]: validatorDataApi.reducer,
  [getTradeQuoteApi.reducerPath]: getTradeQuoteApi.reducer,
  [getBestSwapperApi.reducerPath]: getBestSwapperApi.reducer,
  [getUsdRateApi.reducerPath]: getUsdRateApi.reducer,
  [getUsdRatesApi.reducerPath]: getUsdRatesApi.reducer,
  [foxyApi.reducerPath]: foxyApi.reducer,
  [fiatRampApi.reducerPath]: fiatRampApi.reducer,
  [opportunitiesApi.reducerPath]: opportunitiesApi.reducer,
}

export const reducer = combineReducers({ ...sliceReducers, ...apiReducers })
export type ReduxState = ReturnType<typeof reducer>
