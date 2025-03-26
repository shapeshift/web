import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import React, { lazy, Suspense, useCallback, useState } from 'react'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

import { AddLiquidityRoutePaths } from './types'

import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import type { LpConfirmedDepositQuote } from '@/lib/utils/thorchain/lp/types'
import { makeSuspenseful } from '@/utils/makeSuspenseful'

const suspenseFallback = <div>Loading...</div>

const AddLiquidityConfirm = makeSuspenseful(
  lazy(() =>
    import('./AddLiquidityConfirm').then(({ AddLiquidityConfirm }) => ({
      default: AddLiquidityConfirm,
    })),
  ),
)

const AddLiquidityInput = makeSuspenseful(
  lazy(() =>
    import('./AddLiquidityInput').then(({ AddLiquidityInput }) => ({
      default: AddLiquidityInput,
    })),
  ),
)

const AddLiquidityStatus = makeSuspenseful(
  lazy(() =>
    import('./AddLiquidityStatus').then(({ AddLiquidityStatus }) => ({
      default: AddLiquidityStatus,
    })),
  ),
)

const AddLiquiditySweep = makeSuspenseful(
  lazy(() =>
    import('./AddLiquiditySweep').then(({ AddLiquiditySweep }) => ({
      default: AddLiquiditySweep,
    })),
  ),
)

const AddLiquidityEntries = [
  AddLiquidityRoutePaths.Input,
  AddLiquidityRoutePaths.Confirm,
  AddLiquidityRoutePaths.Status,
  AddLiquidityRoutePaths.Sweep,
]

export type AddLiquidityProps = {
  headerComponent?: JSX.Element
  opportunityId?: string
  poolAssetId?: string
}

export const AddLiquidity: React.FC<AddLiquidityProps> = ({
  opportunityId,
  poolAssetId,
  headerComponent,
}) => {
  const [confirmedQuote, setConfirmedQuote] = useState<LpConfirmedDepositQuote | null>(null)

  return (
    <MemoryRouter initialEntries={AddLiquidityEntries} initialIndex={0}>
      <AddLiquidityRoutes
        opportunityId={opportunityId}
        poolAssetId={poolAssetId}
        headerComponent={headerComponent}
        setConfirmedQuote={setConfirmedQuote}
        confirmedQuote={confirmedQuote}
      />
    </MemoryRouter>
  )
}

type AddLiquidityRoutesProps = AddLiquidityProps & {
  confirmedQuote: LpConfirmedDepositQuote | null
  setConfirmedQuote: (quote: LpConfirmedDepositQuote) => void
}

export const AddLiquidityRoutes: React.FC<AddLiquidityRoutesProps> = ({
  headerComponent,
  opportunityId,
  poolAssetId,
  confirmedQuote,
  setConfirmedQuote,
}) => {
  const mixpanel = getMixPanel()
  const navigate = useNavigate()
  const location = useLocation()
  const [currentAccountIdByChainId, setCurrentAccountIdByChainId] = useState<
    Record<ChainId, AccountId>
  >({})

  const onAccountIdChange = useCallback(
    (accountId: AccountId) => {
      setCurrentAccountIdByChainId(prev => {
        const chainId = fromAccountId(accountId).chainId
        return { ...prev, [chainId]: accountId }
      })
    },
    [setCurrentAccountIdByChainId],
  )

  const renderAddLiquidityInput = useCallback(
    () => (
      <AddLiquidityInput
        opportunityId={opportunityId}
        poolAssetId={poolAssetId}
        headerComponent={headerComponent}
        setConfirmedQuote={setConfirmedQuote}
        confirmedQuote={confirmedQuote}
        currentAccountIdByChainId={currentAccountIdByChainId}
        onAccountIdChange={onAccountIdChange}
      />
    ),
    [
      currentAccountIdByChainId,
      confirmedQuote,
      headerComponent,
      onAccountIdChange,
      opportunityId,
      poolAssetId,
      setConfirmedQuote,
    ],
  )
  const renderAddLiquidityConfirm = useCallback(
    () => (confirmedQuote ? <AddLiquidityConfirm confirmedQuote={confirmedQuote} /> : null),
    [confirmedQuote],
  )

  const renderAddLiquidityStatus = useCallback(
    () => (confirmedQuote ? <AddLiquidityStatus confirmedQuote={confirmedQuote} /> : null),
    [confirmedQuote],
  )

  const renderAddLiquiditySweep = useCallback(() => {
    if (!confirmedQuote) return null
    if (!mixpanel) return null

    const handleSweepSeen = () => {
      if (confirmedQuote.positionStatus?.incomplete) {
        navigate(AddLiquidityRoutePaths.Status)
        mixpanel?.track(MixPanelEvent.LpIncompleteDepositConfirm, confirmedQuote)
      }

      navigate(AddLiquidityRoutePaths.Confirm)
      mixpanel.track(MixPanelEvent.LpDepositPreview, confirmedQuote)
    }

    return (
      <AddLiquiditySweep
        confirmedQuote={confirmedQuote}
        // eslint-disable-next-line react-memo/require-usememo
        onSweepSeen={handleSweepSeen}
        // eslint-disable-next-line react-memo/require-usememo
        onBack={() => {
          navigate(AddLiquidityRoutePaths.Input)
        }}
      />
    )
  }, [confirmedQuote, navigate, mixpanel])

  return (
    <AnimatePresence mode='wait' initial={false}>
      <Routes>
        <Suspense fallback={suspenseFallback}>
          <Route
            key={AddLiquidityRoutePaths.Input}
            path={AddLiquidityRoutePaths.Input}
            element={renderAddLiquidityInput()}
          />
          <Route
            key={AddLiquidityRoutePaths.Confirm}
            path={AddLiquidityRoutePaths.Confirm}
            element={renderAddLiquidityConfirm()}
          />
          <Route
            key={AddLiquidityRoutePaths.Status}
            path={AddLiquidityRoutePaths.Status}
            element={renderAddLiquidityStatus()}
          />
          <Route
            key={AddLiquidityRoutePaths.Sweep}
            path={AddLiquidityRoutePaths.Sweep}
            element={renderAddLiquiditySweep()}
          />
        </Suspense>
      </Routes>
    </AnimatePresence>
  )
}
