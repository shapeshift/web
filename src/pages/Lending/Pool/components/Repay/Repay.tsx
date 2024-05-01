import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { AnimatePresence } from 'framer-motion'
import { lazy, memo, Suspense, useCallback } from 'react'
import { MemoryRouter, Route, Switch, useLocation } from 'react-router'
import { useRouteAssetId } from 'hooks/useRouteAssetId/useRouteAssetId'
import type { LendingQuoteClose } from 'lib/utils/thorchain/lending/types'

import { RepayRoutePaths } from './types'

const RepayEntries = [RepayRoutePaths.Input, RepayRoutePaths.Confirm]

type RepayProps = {
  isAccountSelectionDisabled?: boolean
  collateralAccountId: AccountId | null
  repaymentAccountId: AccountId | null
  repaymentAsset: Asset | null
  setRepaymentAsset: (asset: Asset | null) => void
  onCollateralAccountIdChange: (accountId: AccountId) => void
  onRepaymentAccountIdChange: (accountId: AccountId) => void
  repaymentPercent: number
  setRepaymentPercent: (value: number) => void
  txId: string | null
  setTxid: (txId: string | null) => void
  confirmedQuote: LendingQuoteClose | null
  setConfirmedQuote: (quote: LendingQuoteClose | null) => void
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
  confirmedQuote,
  setConfirmedQuote,
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
        confirmedQuote={confirmedQuote}
        setConfirmedQuote={setConfirmedQuote}
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
  collateralAccountId: AccountId | null
  repaymentAccountId: AccountId | null
  onCollateralAccountIdChange: (accountId: AccountId) => void
  onRepaymentAccountIdChange: (accountId: AccountId) => void
  txId: string | null
  setTxid: (txId: string | null) => void
  confirmedQuote: LendingQuoteClose | null
  setConfirmedQuote: (quote: LendingQuoteClose | null) => void
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
    confirmedQuote,
    setConfirmedQuote,
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
          confirmedQuote={confirmedQuote}
          setConfirmedQuote={setConfirmedQuote}
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
        confirmedQuote,
        setConfirmedQuote,
      ],
    )

    const renderRepayConfirm = useCallback(
      () => (
        <RepayConfirm
          collateralAssetId={collateralAssetId}
          setRepaymentPercent={onRepaymentPercentChange}
          collateralAccountId={collateralAccountId}
          repaymentAccountId={repaymentAccountId}
          repaymentAsset={repaymentAsset}
          txId={txId}
          setTxid={setTxid}
          confirmedQuote={confirmedQuote}
          setConfirmedQuote={setConfirmedQuote}
        />
      ),
      [
        collateralAssetId,
        onRepaymentPercentChange,
        collateralAccountId,
        repaymentAccountId,
        repaymentAsset,
        txId,
        setTxid,
        confirmedQuote,
        setConfirmedQuote,
      ],
    )

    return (
      <AnimatePresence mode='wait' initial={false}>
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
