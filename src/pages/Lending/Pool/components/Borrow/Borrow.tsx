import { AnimatePresence } from 'framer-motion'
import { memo } from 'react'
import { MemoryRouter, Route, Switch, useLocation } from 'react-router'

import { BorrowInput } from './BorrowInput'
import { BorrowConfirm } from './Confirm'
import { BorrowRoutePaths } from './types'

const BorrowEntries = [BorrowRoutePaths.Input, BorrowRoutePaths.Confirm]

export const Borrow = () => {
  return (
    <MemoryRouter initialEntries={BorrowEntries} initialIndex={0}>
      <BorrowRoutes />
    </MemoryRouter>
  )
}

const BorrowRoutes = memo(() => {
  const location = useLocation()
  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      <Switch location={location}>
        <Route key={BorrowRoutePaths.Input} path={BorrowRoutePaths.Input}>
          <BorrowInput />
        </Route>
        <Route key={BorrowRoutePaths.Confirm} path={BorrowRoutePaths.Confirm}>
          <BorrowConfirm />
        </Route>
      </Switch>
    </AnimatePresence>
  )
})
