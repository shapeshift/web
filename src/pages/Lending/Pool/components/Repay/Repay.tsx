import { AnimatePresence } from 'framer-motion'
import { memo } from 'react'
import { MemoryRouter, Route, Switch, useLocation } from 'react-router'

import { RepayInput } from './RepayInput'
import { RepayRoutePaths } from './types'

const RepayEntries = [RepayRoutePaths.Input, RepayRoutePaths.Confirm]

export const Repay = () => {
  return (
    <MemoryRouter initialEntries={RepayEntries} initialIndex={0}>
      <RepayRoutes />
    </MemoryRouter>
  )
}

const RepayRoutes = memo(() => {
  const location = useLocation()
  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      <Switch location={location}>
        <Route key={RepayRoutePaths.Input} path={RepayRoutePaths.Input}>
          <RepayInput />
        </Route>
      </Switch>
    </AnimatePresence>
  )
})
