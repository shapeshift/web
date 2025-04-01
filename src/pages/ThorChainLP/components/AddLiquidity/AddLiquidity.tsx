import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import React, { lazy, Suspense, useCallback, useState } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { Route, Switch } from 'wouter'

import { AddLiquidityRoutePaths } from './types'

import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import type { LpConfirmedDepositQuote } from '@/lib/utils/thorchain/lp/types'
import { makeSuspenseful } from '@/utils/makeSuspenseful'

const suspenseFallback = <div>Loading...</div>

const defaultBoxSpinnerStyle = {
  height: '500px',
}

const AddLiquidityConfirm = makeSuspenseful(
  lazy(() =>
    import('./AddLiquidityConfirm').then(({ AddLiquidityConfirm }) => ({
      default: AddLiquidityConfirm,
    })),
  ),
  defaultBoxSpinnerStyle,
)

const AddLiquidityInput = makeSuspenseful(
  lazy(() =>
    import('./AddLiquidityInput').then(({ AddLiquidityInput }) => ({
      default: AddLiquidityInput,
    })),
  ),
  defaultBoxSpinnerStyle,
)

const AddLiquidityStatus = makeSuspenseful(
  lazy(() =>
    import('./AddLiquidityStatus').then(({ AddLiquidityStatus }) => ({
      default: AddLiquidityStatus,
    })),
  ),
  defaultBoxSpinnerStyle,
)

const AddLiquiditySweep = makeSuspenseful(
  lazy(() =>
    import('./AddLiquiditySweep').then(({ AddLiquiditySweep }) => ({
      default: AddLiquiditySweep,
    })),
  ),
  defaultBoxSpinnerStyle,
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
  const location = useLocation()
  const mixpanel = getMixPanel()

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

    return (
      <AddLiquiditySweep
        confirmedQuote={confirmedQuote}
        onSweepSeen={() => {
          if (confirmedQuote.positionStatus?.incomplete) {
            mixpanel?.track(MixPanelEvent.LpIncompleteDepositConfirm, confirmedQuote)
          } else {
            mixpanel.track(MixPanelEvent.LpDepositPreview, confirmedQuote)
          }
        }}
        onBack={() => {
          window.history.back()
        }}
      />
    )
  }, [confirmedQuote, mixpanel])

  return (
    <AnimatePresence mode='wait' initial={false}>
      <Suspense fallback={suspenseFallback}>
        <Switch location={location.pathname}>
          <Route path={AddLiquidityRoutePaths.Input}>{renderAddLiquidityInput()}</Route>
          <Route path={AddLiquidityRoutePaths.Confirm}>{renderAddLiquidityConfirm()}</Route>
          <Route path={AddLiquidityRoutePaths.Status}>{renderAddLiquidityStatus()}</Route>
          <Route path={AddLiquidityRoutePaths.Sweep}>{renderAddLiquiditySweep()}</Route>
        </Switch>
      </Suspense>
    </AnimatePresence>
  )
}
