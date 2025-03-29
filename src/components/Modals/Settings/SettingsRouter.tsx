import { AnimatePresence } from 'framer-motion'
import type { FC } from 'react'
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
  return (
    <AnimatePresence mode='wait'>
      <Routes>
        <Route path={SettingsRoutes.Index} element={<SettingsList />} />
        <Route path={SettingsRoutes.Languages} element={<Languages />} />
        <Route path={SettingsRoutes.FiatCurrencies} element={<FiatCurrencies />} />
        <Route path={SettingsRoutes.CurrencyFormat} element={<CurrencyFormat />} />
        <Route path={SettingsRoutes.ClearCache} element={<ClearCache />} />
      </Routes>
    </AnimatePresence>
  )
}
