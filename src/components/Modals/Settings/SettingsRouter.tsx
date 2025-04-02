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

// No props needed since we'll use useNavigate in child components
type SettingsRouterProps = {}

export const SettingsRouter: FC<SettingsRouterProps> = () => {
  const settingsListElement = useMemo(() => <SettingsList />, [])
  const languagesElement = useMemo(() => <Languages />, [])
  const fiatCurrenciesElement = useMemo(() => <FiatCurrencies />, [])
  const currencyFormatElement = useMemo(() => <CurrencyFormat />, [])
  const clearCacheElement = useMemo(() => <ClearCache />, [])

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
