import { AnimatePresence } from 'framer-motion'
import type { RouteComponentProps } from 'react-router-dom'
import { Route, Switch, useLocation } from 'react-router-dom'

import { CurrencyFormat } from './CurrencyFormat'
import { FiatCurrencies } from './FiatCurrencies'
import { Languages } from './Languages'
import { SettingsRoutes } from './SettingsCommon'
import { SettingsList } from './SettingsList'

export const SettingsRouter = ({ appHistory }: { appHistory: RouteComponentProps['history'] }) => {
  const location = useLocation()
  return (
    <AnimatePresence exitBeforeEnter>
      <Switch location={location} key={location.key}>
        <Route
          path={SettingsRoutes.Index}
          component={(props: RouteComponentProps) => (
            <SettingsList appHistory={appHistory} {...props} />
          )}
        />
        <Route path={SettingsRoutes.Languages} component={Languages} />
        <Route path={SettingsRoutes.FiatCurrencies} component={FiatCurrencies} />
        <Route path={SettingsRoutes.CurrencyFormat} component={CurrencyFormat} />
      </Switch>
    </AnimatePresence>
  )
}
