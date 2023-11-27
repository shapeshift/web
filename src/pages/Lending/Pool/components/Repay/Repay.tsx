import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import { lazy, memo, Suspense, useCallback } from 'react'
import { MemoryRouter, Route, Switch, useLocation } from 'react-router'
import { useRouteAssetId } from 'hooks/useRouteAssetId/useRouteAssetId'
import type { Asset } from 'lib/asset-service'

import { RepayRoutePaths } from './types'

const RepayEntries = [RepayRoutePaths.Input, RepayRoutePaths.Confirm]

type RepayProps = {
  collateralAccountId: AccountId
  repaymentAccountId: AccountId
  repaymentAsset: Asset | null
  setRepaymentAsset: (asset: Asset | null) => void
  onCollateralAccountIdChange: (accountId: AccountId) => void
  onRepaymentAccountIdChange: (accountId: AccountId) => void
  repaymentPercent: number
  setRepaymentPercent: (value: number) => void
}

export const Repay = ({
  collateralAccountId,
  repaymentAccountId: borrowAccountId,
  repaymentAsset,
  setRepaymentAsset,
  onCollateralAccountIdChange: handleCollateralAccountIdChange,
  onRepaymentAccountIdChange: handleRepaymentAccountIdChange,
  repaymentPercent,
  setRepaymentPercent,
}: RepayProps) => {
  const collateralAssetId = useRouteAssetId()

  return (
    <MemoryRouter initialEntries={RepayEntries} initialIndex={0}>
      <RepayRoutes
        repaymentAsset={repaymentAsset}
        setRepaymentAsset={setRepaymentAsset}
        collateralAssetId={collateralAssetId}
        repaymentPercent={repaymentPercent}
        onRepaymentPercentChange={setRepaymentPercent}
        collateralAccountId={collateralAccountId}
        repaymentAccountId={borrowAccountId}
        onCollateralAccountIdChange={handleCollateralAccountIdChange}
        onRepaymentAccountIdChange={handleRepaymentAccountIdChange}
      />
    </MemoryRouter>
  )
}

type RepayRoutesProps = {
  collateralAssetId: AssetId
  repaymentAsset: Asset | null
  setRepaymentAsset: (asset: Asset | null) => void
  repaymentPercent: number
  onRepaymentPercentChange: (value: number) => void
  collateralAccountId: AccountId
  repaymentAccountId: AccountId
  onCollateralAccountIdChange: (accountId: AccountId) => void
  onRepaymentAccountIdChange: (accountId: AccountId) => void
}

const RepayInput = lazy(() =>
  import('./RepayInput').then(({ RepayInput }) => ({
    default: RepayInput,
  })),
)
const RepayConfirm = lazy(() =>
  import('./RepayConfirm').then(({ RepayConfirm }) => ({
    default: RepayConfirm,
  })),
)

const suspenseFallback = <div>Loading...</div>

const RepayRoutes = memo(
  ({
    collateralAssetId,
    repaymentPercent,
    repaymentAsset,
    setRepaymentAsset,
    onRepaymentPercentChange,
    collateralAccountId,
    repaymentAccountId,
    onCollateralAccountIdChange: handleCollateralAccountIdChange,
    onRepaymentAccountIdChange: handleRepaymentAccountIdChange,
  }: RepayRoutesProps) => {
    const location = useLocation()

    const renderRepayInput = useCallback(
      () => (
        <RepayInput
          collateralAssetId={collateralAssetId}
          repaymentPercent={repaymentPercent}
          collateralAccountId={collateralAccountId}
          repaymentAccountId={repaymentAccountId}
          onCollateralAccountIdChange={handleCollateralAccountIdChange}
          onRepaymentAccountIdChange={handleRepaymentAccountIdChange}
          onRepaymentPercentChange={onRepaymentPercentChange}
          repaymentAsset={repaymentAsset}
          setRepaymentAsset={setRepaymentAsset}
        />
      ),
      [
        collateralAssetId,
        repaymentPercent,
        collateralAccountId,
        repaymentAccountId,
        handleCollateralAccountIdChange,
        handleRepaymentAccountIdChange,
        onRepaymentPercentChange,
        repaymentAsset,
        setRepaymentAsset,
      ],
    )

    const renderRepayConfirm = useCallback(
      () => (
        <RepayConfirm
          collateralAssetId={collateralAssetId}
          repaymentPercent={repaymentPercent}
          collateralAccountId={collateralAccountId}
          repaymentAccountId={repaymentAccountId}
          repaymentAsset={repaymentAsset}
        />
      ),
      [
        collateralAssetId,
        repaymentPercent,
        collateralAccountId,
        repaymentAccountId,
        repaymentAsset,
      ],
    )

    return (
      <AnimatePresence exitBeforeEnter initial={false}>
        <Switch location={location}>
          <Suspense fallback={suspenseFallback}>
            <Route
              key={RepayRoutePaths.Input}
              path={RepayRoutePaths.Input}
              render={renderRepayInput}
            />
            <Route
              key={RepayRoutePaths.Confirm}
              path={RepayRoutePaths.Confirm}
              render={renderRepayConfirm}
            />
          </Suspense>
        </Switch>
      </AnimatePresence>
    )
  },
)
