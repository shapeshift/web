import type { AssetId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import { memo } from 'react'
import { MemoryRouter, Route, Switch, useLocation } from 'react-router'
import { useRouteAssetId } from 'hooks/useRouteAssetId/useRouteAssetId'

import { BorrowConfirm } from './BorrowConfirm'
import { BorrowInput } from './BorrowInput'
import { BorrowRoutePaths } from './types'

const BorrowEntries = [BorrowRoutePaths.Input, BorrowRoutePaths.Confirm]

export const Borrow = () => {
  const collateralAssetId = useRouteAssetId()
  return (
    <MemoryRouter initialEntries={BorrowEntries} initialIndex={0}>
      <BorrowRoutes collateralAssetId={collateralAssetId} />
    </MemoryRouter>
  )
}

type BorrowRoutesProps = {
  collateralAssetId: AssetId
}

const BorrowRoutes = memo(({ collateralAssetId }: BorrowRoutesProps) => {
  const location = useLocation()
  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      <Switch location={location}>
        <Route key={BorrowRoutePaths.Input} path={BorrowRoutePaths.Input}>
          <BorrowInput collateralAssetId={collateralAssetId} />
        </Route>
        <Route key={BorrowRoutePaths.Confirm} path={BorrowRoutePaths.Confirm}>
          <BorrowConfirm />
        </Route>
      </Switch>
    </AnimatePresence>
  )
})
