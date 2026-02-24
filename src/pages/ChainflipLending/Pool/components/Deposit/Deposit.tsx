import type { AssetId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import { lazy, memo, Suspense, useCallback, useMemo, useState } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { Route, Switch } from 'wouter'

import { DepositRoutePaths } from './types'

const DepositInput = lazy(() =>
  import('./DepositInput').then(({ DepositInput }) => ({ default: DepositInput })),
)
const DepositRefundAddress = lazy(() =>
  import('./DepositRefundAddress').then(({ DepositRefundAddress }) => ({
    default: DepositRefundAddress,
  })),
)
const DepositConfirm = lazy(() =>
  import('./DepositConfirm').then(({ DepositConfirm }) => ({ default: DepositConfirm })),
)

const DepositEntries = [
  DepositRoutePaths.Input,
  DepositRoutePaths.RefundAddress,
  DepositRoutePaths.Confirm,
]

const suspenseFallback = <div>Loading...</div>

type DepositProps = {
  assetId: AssetId
}

export const Deposit = ({ assetId }: DepositProps) => {
  const [depositAmountCryptoPrecision, setDepositAmountCryptoPrecision] = useState<string>('')
  const [refundAddress, setRefundAddress] = useState<string>('')

  const handleReset = useCallback(() => {
    setDepositAmountCryptoPrecision('')
    setRefundAddress('')
  }, [])

  return (
    <MemoryRouter initialEntries={DepositEntries} initialIndex={0}>
      <DepositRoutes
        assetId={assetId}
        depositAmountCryptoPrecision={depositAmountCryptoPrecision}
        setDepositAmountCryptoPrecision={setDepositAmountCryptoPrecision}
        refundAddress={refundAddress}
        setRefundAddress={setRefundAddress}
        onReset={handleReset}
      />
    </MemoryRouter>
  )
}

type DepositRoutesProps = {
  assetId: AssetId
  depositAmountCryptoPrecision: string
  setDepositAmountCryptoPrecision: (amount: string) => void
  refundAddress: string
  setRefundAddress: (address: string) => void
  onReset: () => void
}

const DepositRoutes = memo(
  ({
    assetId,
    depositAmountCryptoPrecision,
    setDepositAmountCryptoPrecision,
    refundAddress,
    setRefundAddress,
    onReset,
  }: DepositRoutesProps) => {
    const location = useLocation()

    const depositInput = useMemo(
      () => (
        <DepositInput
          assetId={assetId}
          depositAmountCryptoPrecision={depositAmountCryptoPrecision}
          setDepositAmountCryptoPrecision={setDepositAmountCryptoPrecision}
        />
      ),
      [assetId, depositAmountCryptoPrecision, setDepositAmountCryptoPrecision],
    )

    const depositRefundAddress = useMemo(
      () => (
        <DepositRefundAddress
          assetId={assetId}
          refundAddress={refundAddress}
          setRefundAddress={setRefundAddress}
        />
      ),
      [assetId, refundAddress, setRefundAddress],
    )

    const depositConfirm = useMemo(
      () => (
        <DepositConfirm
          assetId={assetId}
          depositAmountCryptoPrecision={depositAmountCryptoPrecision}
          refundAddress={refundAddress}
          onReset={onReset}
        />
      ),
      [assetId, depositAmountCryptoPrecision, refundAddress, onReset],
    )

    return (
      <AnimatePresence mode='wait' initial={false}>
        <Suspense fallback={suspenseFallback}>
          <Switch location={location.pathname}>
            <Route key={DepositRoutePaths.Input} path={DepositRoutePaths.Input}>
              {depositInput}
            </Route>
            <Route key={DepositRoutePaths.RefundAddress} path={DepositRoutePaths.RefundAddress}>
              {depositRefundAddress}
            </Route>
            <Route key={DepositRoutePaths.Confirm} path={DepositRoutePaths.Confirm}>
              {depositConfirm}
            </Route>
          </Switch>
        </Suspense>
      </AnimatePresence>
    )
  },
)
