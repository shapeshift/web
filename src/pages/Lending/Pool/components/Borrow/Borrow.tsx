import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import { lazy, memo, Suspense, useCallback, useState } from 'react'
import { MemoryRouter, Route, Switch, useLocation } from 'react-router'
import { useRouteAssetId } from 'hooks/useRouteAssetId/useRouteAssetId'
import type { Asset } from 'lib/asset-service'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { BorrowRoutePaths } from './types'

const BorrowInput = lazy(() =>
  import('./BorrowInput').then(({ BorrowInput }) => ({ default: BorrowInput })),
)
const BorrowSweep = lazy(() =>
  import('./BorrowSweep').then(({ BorrowSweep }) => ({ default: BorrowSweep })),
)
const BorrowConfirm = lazy(() =>
  import('./BorrowConfirm').then(({ BorrowConfirm }) => ({ default: BorrowConfirm })),
)

const BorrowEntries = [BorrowRoutePaths.Input, BorrowRoutePaths.Confirm]

const suspenseFallback = <div>Loading...</div>

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
  const [cryptoDepositAmount, setCryptoDepositAmount] = useState<string | null>(null)
  const [fiatDepositAmount, setFiatDepositAmount] = useState<string | null>(null)

  const collateralAssetId = useRouteAssetId()

  const collateralAssetMarketData = useAppSelector(state =>
    selectMarketDataById(state, collateralAssetId),
  )
  const handleDepositAmountChange = useCallback(
    (value: string, isFiat?: boolean) => {
      const crypto = (() => {
        if (!isFiat) return value
        const valueCryptoPrecision = bnOrZero(value)
          .div(bn(collateralAssetMarketData?.price ?? '0'))
          .toFixed()
        return valueCryptoPrecision
      })()
      const fiat = (() => {
        if (isFiat) return value
        const valueFiatUserCurrency = bnOrZero(value)
          .times(bn(collateralAssetMarketData?.price ?? '0'))
          .toFixed()
        return valueFiatUserCurrency
      })()

      setCryptoDepositAmount(crypto)
      setFiatDepositAmount(fiat)
    },
    [collateralAssetMarketData?.price],
  )

  return (
    <MemoryRouter initialEntries={BorrowEntries} initialIndex={0}>
      <BorrowRoutes
        collateralAssetId={collateralAssetId}
        cryptoDepositAmount={cryptoDepositAmount}
        fiatDepositAmount={fiatDepositAmount}
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
  cryptoDepositAmount: string | null
  fiatDepositAmount: string | null
  onDepositAmountChange: (value: string, isFiat?: boolean) => void
  collateralAccountId: AccountId
  borrowAccountId: AccountId
  onCollateralAccountIdChange: (accountId: AccountId) => void
  onBorrowAccountIdChange: (accountId: AccountId) => void
}

const BorrowRoutes = memo(
  ({
    collateralAssetId,
    cryptoDepositAmount,
    fiatDepositAmount,
    onDepositAmountChange,
    collateralAccountId,
    borrowAccountId,
    onCollateralAccountIdChange: handleCollateralAccountIdChange,
    onBorrowAccountIdChange: handleBorrowAccountIdChange,
  }: BorrowRoutesProps) => {
    const location = useLocation()
    const [borrowAsset, setBorrowAsset] = useState<Asset | null>(null)

    const renderBorrowInput = useCallback(
      () => (
        <BorrowInput
          collateralAssetId={collateralAssetId}
          depositAmountCryptoPrecision={cryptoDepositAmount}
          fiatDepositAmount={fiatDepositAmount}
          collateralAccountId={collateralAccountId}
          borrowAccountId={borrowAccountId}
          onCollateralAccountIdChange={handleCollateralAccountIdChange}
          onBorrowAccountIdChange={handleBorrowAccountIdChange}
          onDepositAmountChange={onDepositAmountChange}
          borrowAsset={borrowAsset}
          setBorrowAsset={setBorrowAsset}
        />
      ),
      [
        collateralAssetId,
        cryptoDepositAmount,
        fiatDepositAmount,
        collateralAccountId,
        borrowAccountId,
        handleCollateralAccountIdChange,
        handleBorrowAccountIdChange,
        onDepositAmountChange,
        borrowAsset,
        setBorrowAsset,
      ],
    )

    const renderBorrowSweep = useCallback(
      () => (
        <BorrowSweep
          collateralAssetId={collateralAssetId}
          collateralAccountId={collateralAccountId}
        />
      ),
      [collateralAssetId, collateralAccountId],
    )

    const renderBorrowConfirm = useCallback(
      () => (
        <BorrowConfirm
          collateralAssetId={collateralAssetId}
          depositAmount={cryptoDepositAmount}
          borrowAccountId={borrowAccountId}
          collateralAccountId={collateralAccountId}
          borrowAsset={borrowAsset}
        />
      ),
      [collateralAssetId, cryptoDepositAmount, borrowAccountId, collateralAccountId, borrowAsset],
    )

    return (
      <AnimatePresence exitBeforeEnter initial={false}>
        <Switch location={location}>
          <Suspense fallback={suspenseFallback}>
            <Route
              key={BorrowRoutePaths.Input}
              path={BorrowRoutePaths.Input}
              render={renderBorrowInput}
            />
            <Route
              key={BorrowRoutePaths.Sweep}
              path={BorrowRoutePaths.Sweep}
              render={renderBorrowSweep}
            />

            <Route
              key={BorrowRoutePaths.Confirm}
              path={BorrowRoutePaths.Confirm}
              render={renderBorrowConfirm}
            />
          </Suspense>
        </Switch>
      </AnimatePresence>
    )
  },
)
