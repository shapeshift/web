import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import { memo, useCallback, useState } from 'react'
import { MemoryRouter, Route, Switch, useLocation } from 'react-router'
import { useRouteAssetId } from 'hooks/useRouteAssetId/useRouteAssetId'
import type { Asset } from 'lib/asset-service'

import { RepayConfirm } from './RepayConfirm'
import { RepayInput } from './RepayInput'
import { RepayRoutePaths } from './types'

const RepayEntries = [RepayRoutePaths.Input, RepayRoutePaths.Confirm]

type RepayProps = {
  collateralAccountId: AccountId
  borrowAccountId: AccountId
  onCollateralAccountIdChange: (accountId: AccountId) => void
  onBorrowAccountIdChange: (accountId: AccountId) => void
}

export const Repay = ({
  collateralAccountId,
  borrowAccountId,
  onCollateralAccountIdChange: handleCollateralAccountIdChange,
  onBorrowAccountIdChange: handleBorrowAccountIdChange,
}: RepayProps) => {
  const [repaymentPercent, setRepaymentPercent] = useState<number>(100)

  const collateralAssetId = useRouteAssetId()

  const handleDepositAmountChange = useCallback((value: number) => {
    setRepaymentPercent(value)
  }, [])

  return (
    <MemoryRouter initialEntries={RepayEntries} initialIndex={0}>
      <RepayRoutes
        collateralAssetId={collateralAssetId}
        repaymentPercent={repaymentPercent}
        onRepaymentPercentChange={handleDepositAmountChange}
        collateralAccountId={collateralAccountId}
        borrowAccountId={borrowAccountId}
        onCollateralAccountIdChange={handleCollateralAccountIdChange}
        onBorrowAccountIdChange={handleBorrowAccountIdChange}
      />
    </MemoryRouter>
  )
}

type RepayRoutesProps = {
  collateralAssetId: AssetId
  repaymentPercent: number
  onRepaymentPercentChange: (value: number) => void
  collateralAccountId: AccountId
  borrowAccountId: AccountId
  onCollateralAccountIdChange: (accountId: AccountId) => void
  onBorrowAccountIdChange: (accountId: AccountId) => void
}

const RepayRoutes = memo(
  ({
    collateralAssetId,
    repaymentPercent,
    onRepaymentPercentChange,
    collateralAccountId,
    borrowAccountId,
    onCollateralAccountIdChange: handleCollateralAccountIdChange,
    onBorrowAccountIdChange: handleBorrowAccountIdChange,
  }: RepayRoutesProps) => {
    const location = useLocation()
    const [repaymentAsset, setRepaymentAsset] = useState<Asset | null>(null)

    console.log({ repaymentAsset })

    return (
      <AnimatePresence exitBeforeEnter initial={false}>
        <Switch location={location}>
          <Route key={RepayRoutePaths.Input} path={RepayRoutePaths.Input}>
            <RepayInput
              collateralAssetId={collateralAssetId}
              repaymentPercent={repaymentPercent}
              collateralAccountId={collateralAccountId}
              borrowAccountId={borrowAccountId}
              onCollateralAccountIdChange={handleCollateralAccountIdChange}
              onBorrowAccountIdChange={handleBorrowAccountIdChange}
              onRepaymentPercentChange={onRepaymentPercentChange}
              repaymentAsset={repaymentAsset}
              setRepaymentAsset={setRepaymentAsset}
            />
          </Route>
          <Route key={RepayRoutePaths.Confirm} path={RepayRoutePaths.Confirm}>
            <RepayConfirm />
          </Route>
        </Switch>
      </AnimatePresence>
    )
  },
)
