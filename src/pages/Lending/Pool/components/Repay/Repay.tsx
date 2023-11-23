import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import { lazy, memo, Suspense, useCallback } from 'react'
import { MemoryRouter, Route, Switch, useLocation } from 'react-router'
import { useRouteAssetId } from 'hooks/useRouteAssetId/useRouteAssetId'
import type { Asset } from 'lib/asset-service'

import { RepayRoutePaths } from './types'

const RepayEntries = [RepayRoutePaths.Input, RepayRoutePaths.Confirm]

type RepayProps = {
  isAccountSelectionDisabled?: boolean
  collateralAccountId: AccountId
  repaymentAccountId: AccountId
  repaymentAsset: Asset | null
  setRepaymentAsset: (asset: Asset | null) => void
  onCollateralAccountIdChange: (accountId: AccountId) => void
  onRepaymentAccountIdChange: (accountId: AccountId) => void
  repaymentPercent: number
  setRepaymentPercent: (value: number) => void
  txId: string | null
  setTxid: (txId: string | null) => void
}

export const Repay = ({
  isAccountSelectionDisabled,
  collateralAccountId,
  repaymentAccountId: borrowAccountId,
  repaymentAsset,
  setRepaymentAsset,
  onCollateralAccountIdChange: handleCollateralAccountIdChange,
  onRepaymentAccountIdChange: handleRepaymentAccountIdChange,
  repaymentPercent,
  setRepaymentPercent,
  txId,
  setTxid,
}: RepayProps) => {
  const collateralAssetId = useRouteAssetId()

  return (
    <MemoryRouter initialEntries={RepayEntries} initialIndex={0}>
      <RepayRoutes
        isAccountSelectionDisabled={isAccountSelectionDisabled}
        repaymentAsset={repaymentAsset}
        setRepaymentAsset={setRepaymentAsset}
        collateralAssetId={collateralAssetId}
        repaymentPercent={repaymentPercent}
        onRepaymentPercentChange={setRepaymentPercent}
        collateralAccountId={collateralAccountId}
        repaymentAccountId={borrowAccountId}
        onCollateralAccountIdChange={handleCollateralAccountIdChange}
        onRepaymentAccountIdChange={handleRepaymentAccountIdChange}
        txId={txId}
        setTxid={setTxid}
      />
    </MemoryRouter>
  )
}

type RepayRoutesProps = {
  isAccountSelectionDisabled?: boolean
  collateralAssetId: AssetId
  repaymentAsset: Asset | null
  setRepaymentAsset: (asset: Asset | null) => void
  repaymentPercent: number
  onRepaymentPercentChange: (value: number) => void
  collateralAccountId: AccountId
  repaymentAccountId: AccountId
  onCollateralAccountIdChange: (accountId: AccountId) => void
  onRepaymentAccountIdChange: (accountId: AccountId) => void
  txId: string | null
  setTxid: (txId: string | null) => void
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
    isAccountSelectionDisabled,
    collateralAssetId,
    repaymentPercent,
    repaymentAsset,
    setRepaymentAsset,
    onRepaymentPercentChange,
    collateralAccountId,
    repaymentAccountId,
    onCollateralAccountIdChange: handleCollateralAccountIdChange,
    onRepaymentAccountIdChange: handleRepaymentAccountIdChange,
    txId,
    setTxid,
  }: RepayRoutesProps) => {
    const location = useLocation()

    const renderRepayInput = useCallback(
      () => (
        <RepayInput
          isAccountSelectionDisabled={isAccountSelectionDisabled}
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
        isAccountSelectionDisabled,
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
          txId={txId}
          setTxid={setTxid}
        />
      ),
      [
        collateralAssetId,
        repaymentPercent,
        collateralAccountId,
        repaymentAccountId,
        repaymentAsset,
        txId,
        setTxid,
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
