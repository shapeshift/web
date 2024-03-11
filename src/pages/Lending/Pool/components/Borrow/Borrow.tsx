import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { AnimatePresence } from 'framer-motion'
import { lazy, memo, Suspense, useCallback, useState } from 'react'
import { MemoryRouter, Route, Switch, useLocation } from 'react-router'
import { useRouteAssetId } from 'hooks/useRouteAssetId/useRouteAssetId'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { LendingQuoteOpen } from 'lib/utils/thorchain/lending/types'
import { selectMarketDataByAssetIdUserCurrency } from 'state/slices/selectors'
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
  isAccountSelectionDisabled?: boolean
  collateralAccountId: AccountId
  borrowAccountId: AccountId
  onCollateralAccountIdChange: (accountId: AccountId) => void
  onBorrowAccountIdChange: (accountId: AccountId) => void
  depositAmountCryptoPrecision: string | null
  setCryptoDepositAmount: (amount: string | null) => void
  borrowAsset: Asset | null
  setBorrowAsset: (asset: Asset | null) => void
  txId: string | null
  setTxid: (txId: string | null) => void
  confirmedQuote: LendingQuoteOpen | null
  setConfirmedQuote: (quote: LendingQuoteOpen | null) => void
}
export const Borrow = ({
  borrowAsset,
  isAccountSelectionDisabled,
  setBorrowAsset,
  collateralAccountId,
  borrowAccountId,
  onCollateralAccountIdChange: handleCollateralAccountIdChange,
  onBorrowAccountIdChange: handleBorrowAccountIdChange,
  depositAmountCryptoPrecision,
  setCryptoDepositAmount,
  txId,
  setTxid,
  confirmedQuote,
  setConfirmedQuote,
}: BorrowProps) => {
  const [fiatDepositAmount, setFiatDepositAmount] = useState<string | null>(null)

  const collateralAssetId = useRouteAssetId()

  const collateralAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, collateralAssetId),
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
    [collateralAssetMarketData?.price, setCryptoDepositAmount],
  )

  return (
    <MemoryRouter initialEntries={BorrowEntries} initialIndex={0}>
      <BorrowRoutes
        borrowAsset={borrowAsset}
        setBorrowAsset={setBorrowAsset}
        collateralAssetId={collateralAssetId}
        cryptoDepositAmount={depositAmountCryptoPrecision}
        setDepositAmount={setCryptoDepositAmount}
        fiatDepositAmount={fiatDepositAmount}
        onDepositAmountChange={handleDepositAmountChange}
        collateralAccountId={collateralAccountId}
        borrowAccountId={borrowAccountId}
        isAccountSelectionDisabled={isAccountSelectionDisabled}
        onCollateralAccountIdChange={handleCollateralAccountIdChange}
        onBorrowAccountIdChange={handleBorrowAccountIdChange}
        txId={txId}
        setTxid={setTxid}
        confirmedQuote={confirmedQuote}
        setConfirmedQuote={setConfirmedQuote}
      />
    </MemoryRouter>
  )
}

type BorrowRoutesProps = {
  borrowAsset: Asset | null
  setBorrowAsset: (asset: Asset | null) => void
  collateralAssetId: AssetId
  cryptoDepositAmount: string | null
  setDepositAmount: (amount: string | null) => void
  fiatDepositAmount: string | null
  onDepositAmountChange: (value: string, isFiat?: boolean) => void
  isAccountSelectionDisabled?: boolean
  collateralAccountId: AccountId
  borrowAccountId: AccountId
  onCollateralAccountIdChange: (accountId: AccountId) => void
  onBorrowAccountIdChange: (accountId: AccountId) => void
  txId: string | null
  setTxid: (txId: string | null) => void
  confirmedQuote: LendingQuoteOpen | null
  setConfirmedQuote: (quote: LendingQuoteOpen | null) => void
}

const BorrowRoutes = memo(
  ({
    borrowAsset,
    setBorrowAsset,
    collateralAssetId,
    cryptoDepositAmount,
    setDepositAmount,
    fiatDepositAmount,
    isAccountSelectionDisabled,
    onDepositAmountChange,
    collateralAccountId,
    borrowAccountId,
    onCollateralAccountIdChange: handleCollateralAccountIdChange,
    onBorrowAccountIdChange: handleBorrowAccountIdChange,
    txId,
    setTxid,
    confirmedQuote,
    setConfirmedQuote,
  }: BorrowRoutesProps) => {
    const location = useLocation()

    const renderBorrowInput = useCallback(
      () => (
        <BorrowInput
          isAccountSelectionDisabled={isAccountSelectionDisabled}
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
          confirmedQuote={confirmedQuote}
          setConfirmedQuote={setConfirmedQuote}
        />
      ),
      [
        isAccountSelectionDisabled,
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
        confirmedQuote,
        setConfirmedQuote,
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
          setDepositAmount={setDepositAmount}
          borrowAccountId={borrowAccountId}
          collateralAccountId={collateralAccountId}
          borrowAsset={borrowAsset}
          txId={txId}
          setTxid={setTxid}
          confirmedQuote={confirmedQuote}
          setConfirmedQuote={setConfirmedQuote}
        />
      ),
      [
        collateralAssetId,
        cryptoDepositAmount,
        setDepositAmount,
        borrowAccountId,
        collateralAccountId,
        borrowAsset,
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
