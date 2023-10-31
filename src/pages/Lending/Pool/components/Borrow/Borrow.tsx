import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import { memo, useCallback, useState } from 'react'
import { MemoryRouter, Route, Switch, useLocation } from 'react-router'
import { useRouteAssetId } from 'hooks/useRouteAssetId/useRouteAssetId'

import { BorrowConfirm } from './BorrowConfirm'
import { BorrowInput } from './BorrowInput'
import { BorrowRoutePaths } from './types'

const BorrowEntries = [BorrowRoutePaths.Input, BorrowRoutePaths.Confirm]

export const Borrow = () => {
  const [depositAmount, setDepositAmount] = useState<string | null>(null)

  const handleDepositAmountChange = useCallback((value: string) => {
    setDepositAmount(value)
  }, [])

  const collateralAssetId = useRouteAssetId()

  return (
    <MemoryRouter initialEntries={BorrowEntries} initialIndex={0}>
      <BorrowRoutes
        collateralAssetId={collateralAssetId}
        depositAmount={depositAmount}
        onDepositAmountChange={handleDepositAmountChange}
      />
    </MemoryRouter>
  )
}

type BorrowRoutesProps = {
  collateralAssetId: AssetId
  depositAmount: string | null
  onDepositAmountChange: (value: string) => void
}

const BorrowRoutes = memo(
  ({ collateralAssetId, depositAmount, onDepositAmountChange }: BorrowRoutesProps) => {
    const [collateralAccountId, setCollateralAccountId] = useState<AccountId>('')
    const [borrowAccountId, setBorrowAccountId] = useState<AccountId>('')
    const location = useLocation()

    return (
      <AnimatePresence exitBeforeEnter initial={false}>
        <Switch location={location}>
          <Route key={BorrowRoutePaths.Input} path={BorrowRoutePaths.Input}>
            <BorrowInput
              collateralAssetId={collateralAssetId}
              depositAmount={depositAmount}
              collateralAccountId={collateralAccountId}
              borrowAccountId={borrowAccountId}
              onCollateralAccountIdChange={setCollateralAccountId}
              onBorrowAccountIdChange={setBorrowAccountId}
              onDepositAmountChange={onDepositAmountChange}
            />
          </Route>
          <Route key={BorrowRoutePaths.Confirm} path={BorrowRoutePaths.Confirm}>
            <BorrowConfirm collateralAssetId={collateralAssetId} depositAmount={depositAmount} />
          </Route>
        </Switch>
      </AnimatePresence>
    )
  },
)
