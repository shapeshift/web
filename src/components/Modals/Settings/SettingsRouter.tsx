import { AnimatePresence } from 'framer-motion'
import { Route, RouteComponentProps, Switch, useLocation } from 'react-router-dom'

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
        <Route path={SettingsRoutes.Languages} component={() => <Languages />} />
      </Switch>
    </AnimatePresence>
  )
}
