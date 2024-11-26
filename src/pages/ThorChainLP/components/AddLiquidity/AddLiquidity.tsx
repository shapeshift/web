import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import React, { lazy, Suspense, useCallback, useState } from 'react'
import { MemoryRouter, Route, Switch, useHistory, useLocation } from 'react-router'
import { makeSuspenseful } from 'utils/makeSuspenseful'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'
import type { LpConfirmedDepositQuote } from 'lib/utils/thorchain/lp/types'

import { AddLiquidityRoutePaths } from './types'

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
  const history = useHistory()
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

    const handleSweepSeen = () => {
      if (confirmedQuote.positionStatus?.incomplete) {
        history.push(AddLiquidityRoutePaths.Status)
        mixpanel?.track(MixPanelEvent.LpIncompleteDepositConfirm, confirmedQuote)
      }

      history.push(AddLiquidityRoutePaths.Confirm)
      mixpanel?.track(MixPanelEvent.LpDepositPreview, confirmedQuote!)
    }

    return (
      <AddLiquiditySweep
        confirmedQuote={confirmedQuote}
        // eslint-disable-next-line react-memo/require-usememo
        onSweepSeen={handleSweepSeen}
        // eslint-disable-next-line react-memo/require-usememo
        onBack={() => {
          history.push(AddLiquidityRoutePaths.Input)
        }}
      />
    )
  }, [confirmedQuote, history, mixpanel])

  return (
    <AnimatePresence mode='wait' initial={false}>
      <Switch location={location}>
        <Suspense fallback={suspenseFallback}>
          <Route
            key={AddLiquidityRoutePaths.Input}
            path={AddLiquidityRoutePaths.Input}
            render={renderAddLiquidityInput}
          />
          <Route
            key={AddLiquidityRoutePaths.Confirm}
            path={AddLiquidityRoutePaths.Confirm}
            render={renderAddLiquidityConfirm}
          />
          <Route
            key={AddLiquidityRoutePaths.Status}
            path={AddLiquidityRoutePaths.Status}
            render={renderAddLiquidityStatus}
          />
          <Route
            key={AddLiquidityRoutePaths.Sweep}
            path={AddLiquidityRoutePaths.Sweep}
            render={renderAddLiquiditySweep}
          />
        </Suspense>
      </Switch>
    </AnimatePresence>
  )
}
