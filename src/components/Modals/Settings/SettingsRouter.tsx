import { AnimatePresence } from 'framer-motion'
import type { FC } from 'react'
import { useMemo } from 'react'
import { Route, Routes } from 'react-router-dom'

import { ClearCache } from './ClearCache'
import { CurrencyFormat } from './CurrencyFormat'
import { FiatCurrencies } from './FiatCurrencies'
import { Languages } from './Languages'
import { SettingsRoutes } from './SettingsCommon'
import { SettingsList } from './SettingsList'

const settingsListElement = <SettingsList />
const languagesElement = <Languages />
const fiatCurrenciesElement = <FiatCurrencies />
const currencyFormatElement = <CurrencyFormat />
const clearCacheElement = <ClearCache />

export const SettingsRouter: FC = () => {
  return (
    <AnimatePresence mode='wait'>
      <Routes>
        <Route path={SettingsRoutes.Index} element={settingsListElement} />
        <Route path={SettingsRoutes.Languages} element={languagesElement} />
        <Route path={SettingsRoutes.FiatCurrencies} element={fiatCurrenciesElement} />
        <Route path={SettingsRoutes.CurrencyFormat} element={currencyFormatElement} />
        <Route path={SettingsRoutes.ClearCache} element={clearCacheElement} />
      </Routes>
    </AnimatePresence>
  )
}
