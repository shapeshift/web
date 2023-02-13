import { AnimatePresence } from 'framer-motion'
import { useMemo } from 'react'
import { MemoryRouter, Redirect, Route, Switch } from 'react-router'

import { OnboardPager } from './components/OnboardPager'
import { OnboardingRoutes } from './config'

export const NativeOnboarding = () => {
  const renderRoutes = useMemo(() => {
    return OnboardingRoutes.map(route => (
      <Route key={route.path} path={route.path} component={route.component} />
    ))
  }, [])
  return (
    <MemoryRouter>
      <Route>
        {({ location }) => (
          <>
            <AnimatePresence exitBeforeEnter initial={false}>
              <Switch key={location.key} location={location}>
                {renderRoutes}
                <Redirect exact from='/' to='/self-custody' />
              </Switch>
            </AnimatePresence>
            <OnboardPager activeRoute={location.pathname} />
          </>
        )}
      </Route>
    </MemoryRouter>
  )
}
