import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import { memo, useCallback, useState } from 'react'
import { MemoryRouter, Route, Switch, useLocation } from 'react-router'
import { useRouteAssetId } from 'hooks/useRouteAssetId/useRouteAssetId'
import type { Asset } from 'lib/asset-service'

import { BorrowConfirm } from './BorrowConfirm'
import { BorrowInput } from './BorrowInput'
import { BorrowRoutePaths } from './types'

const BorrowEntries = [BorrowRoutePaths.Input, BorrowRoutePaths.Confirm]

type BorrowProps = {
  collateralAccountId: AccountId
  borrowAccountId: AccountId
  onCollateralAccountIdChange: (accountId: AccountId) => void
  onBorrowAccountIdChange: (accountId: AccountId) => void
}
export const Borrow = ({
  collateralAccountId,
  borrowAccountId,
  onCollateralAccountIdChange: handleCollateralAccountIdChange,
  onBorrowAccountIdChange: handleBorrowAccountIdChange,
}: BorrowProps) => {
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
        collateralAccountId={collateralAccountId}
        borrowAccountId={borrowAccountId}
        onCollateralAccountIdChange={handleCollateralAccountIdChange}
        onBorrowAccountIdChange={handleBorrowAccountIdChange}
      />
    </MemoryRouter>
  )
}

type BorrowRoutesProps = {
  collateralAssetId: AssetId
  depositAmount: string | null
  onDepositAmountChange: (value: string) => void
  collateralAccountId: AccountId
  borrowAccountId: AccountId
  onCollateralAccountIdChange: (accountId: AccountId) => void
  onBorrowAccountIdChange: (accountId: AccountId) => void
}

const BorrowRoutes = memo(
  ({
    collateralAssetId,
    depositAmount,
    onDepositAmountChange,
    collateralAccountId,
    borrowAccountId,
    onCollateralAccountIdChange: handleCollateralAccountIdChange,
    onBorrowAccountIdChange: handleBorrowAccountIdChange,
  }: BorrowRoutesProps) => {
    const location = useLocation()
    const [borrowAsset, setBorrowAsset] = useState<Asset | null>(null)

    return (
      <AnimatePresence exitBeforeEnter initial={false}>
        <Switch location={location}>
          <Route key={BorrowRoutePaths.Input} path={BorrowRoutePaths.Input}>
            <BorrowInput
              collateralAssetId={collateralAssetId}
              depositAmount={depositAmount}
              collateralAccountId={collateralAccountId}
              borrowAccountId={borrowAccountId}
              onCollateralAccountIdChange={handleCollateralAccountIdChange}
              onBorrowAccountIdChange={handleBorrowAccountIdChange}
              onDepositAmountChange={onDepositAmountChange}
              borrowAsset={borrowAsset}
              setBorrowAsset={setBorrowAsset}
            />
          </Route>
          <Route key={BorrowRoutePaths.Confirm} path={BorrowRoutePaths.Confirm}>
            <BorrowConfirm
              collateralAssetId={collateralAssetId}
              depositAmount={depositAmount}
              borrowAccountId={borrowAccountId}
              collateralAccountId={collateralAccountId}
              borrowAsset={borrowAsset}
            />
          </Route>
        </Switch>
      </AnimatePresence>
    )
  },
)
