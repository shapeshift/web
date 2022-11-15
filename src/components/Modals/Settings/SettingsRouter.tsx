import { AnimatePresence } from 'framer-motion'
import type { FC } from 'react'
import type { RouteComponentProps } from 'react-router-dom'
import { Route, Switch, useLocation } from 'react-router-dom'

import { CurrencyFormat } from './CurrencyFormat'
import { FiatCurrencies } from './FiatCurrencies'
import { Languages } from './Languages'
import { SettingsRoutes } from './SettingsCommon'
import { SettingsList } from './SettingsList'

type SettingsRouterProps = {
  appHistory: RouteComponentProps['history']
}

export const SettingsRouter: FC<SettingsRouterProps> = ({ appHistory }) => {
  const location = useLocation()

  return (
    <AnimatePresence exitBeforeEnter>
      <Switch location={location} key={location.key}>
        <Route path={SettingsRoutes.Index}>
          <SettingsList appHistory={appHistory} />
        </Route>
        <Route path={SettingsRoutes.Languages}>
          <Languages />
        </Route>
        <Route path={SettingsRoutes.FiatCurrencies}>
          <FiatCurrencies />
        </Route>
        <Route path={SettingsRoutes.CurrencyFormat}>
          <CurrencyFormat />
        </Route>
      </Switch>
    </AnimatePresence>
  )
}
