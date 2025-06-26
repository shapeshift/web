import type { AccountId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import type { JSX } from 'react'
import React, { lazy, Suspense, useCallback, useState } from 'react'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { Route, Switch } from 'wouter'

import { RemoveLiquidityRoutePaths } from './types'

import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import type { LpConfirmedWithdrawalQuote } from '@/lib/utils/thorchain/lp/types'
import { makeSuspenseful } from '@/utils/makeSuspenseful'

const suspenseFallback = <div>Loading...</div>

const defaultBoxSpinnerStyle = {
  height: '500px',
}

const RemoveLiquidityConfirm = makeSuspenseful(
  lazy(() =>
    import('./RemoveLiquidityConfirm').then(({ RemoveLiquidityConfirm }) => ({
      default: RemoveLiquidityConfirm,
    })),
  ),
  defaultBoxSpinnerStyle,
)

const RemoveLiquidityInput = makeSuspenseful(
  lazy(() =>
    import('./RemoveLiquidityInput').then(({ RemoveLiquidityInput }) => ({
      default: RemoveLiquidityInput,
    })),
  ),
  defaultBoxSpinnerStyle,
)

const RemoveLiquidityStatus = makeSuspenseful(
  lazy(() =>
    import('./RemoveLiquidityStatus').then(({ RemoveLiquidityStatus }) => ({
      default: RemoveLiquidityStatus,
    })),
  ),
  defaultBoxSpinnerStyle,
)

const RemoveLiquiditySweep = makeSuspenseful(
  lazy(() =>
    import('./RemoveLiquiditySweep').then(({ RemoveLiquiditySweep }) => ({
      default: RemoveLiquiditySweep,
    })),
  ),
  defaultBoxSpinnerStyle,
)

const RemoveLiquidityEntries = [
  RemoveLiquidityRoutePaths.Input,
  RemoveLiquidityRoutePaths.Confirm,
  RemoveLiquidityRoutePaths.Status,
  RemoveLiquidityRoutePaths.Sweep,
]

export type RemoveLiquidityProps = {
  headerComponent: JSX.Element
  opportunityId: string
  accountId: AccountId
  poolAssetId: string
}

export const RemoveLiquidity: React.FC<RemoveLiquidityProps> = ({
  headerComponent,
  opportunityId,
  accountId,
  poolAssetId,
}) => {
  const [confirmedQuote, setConfirmedQuote] = useState<LpConfirmedWithdrawalQuote | null>(null)

  return (
    <MemoryRouter initialEntries={RemoveLiquidityEntries} initialIndex={0}>
      <RemoveLiquidityRoutes
        headerComponent={headerComponent}
        opportunityId={opportunityId}
        accountId={accountId}
        poolAssetId={poolAssetId}
        confirmedQuote={confirmedQuote}
        setConfirmedQuote={setConfirmedQuote}
      />
    </MemoryRouter>
  )
}

type RemoveLiquidityRoutesProps = RemoveLiquidityProps & {
  confirmedQuote: LpConfirmedWithdrawalQuote | null
  setConfirmedQuote: (quote: LpConfirmedWithdrawalQuote) => void
}

export const RemoveLiquidityRoutes: React.FC<RemoveLiquidityRoutesProps> = ({
  headerComponent,
  opportunityId,
  accountId,
  poolAssetId,
  confirmedQuote,
  setConfirmedQuote,
}) => {
  const location = useLocation()
  const mixpanel = getMixPanel()
  const navigate = useNavigate()

  const handleSweepSeen = useCallback(() => {
    if (!confirmedQuote || !mixpanel) return

    if (confirmedQuote.positionStatus?.incomplete) {
      navigate(RemoveLiquidityRoutePaths.Status)
      mixpanel.track(
        MixPanelEvent.LpIncompleteWithdrawPreview,
        confirmedQuote as Record<string, unknown>,
      )
    } else {
      navigate(RemoveLiquidityRoutePaths.Confirm)
      mixpanel.track(MixPanelEvent.LpWithdrawPreview, confirmedQuote as Record<string, unknown>)
    }
  }, [confirmedQuote, mixpanel])

  const handleBack = useCallback(() => {
    window.history.back()
  }, [])

  return (
    <AnimatePresence mode='wait' initial={false}>
      <Suspense fallback={suspenseFallback}>
        <Switch location={location.pathname}>
          <Route path={RemoveLiquidityRoutePaths.Input}>
            <RemoveLiquidityInput
              headerComponent={headerComponent}
              opportunityId={opportunityId}
              accountId={accountId}
              poolAssetId={poolAssetId}
              confirmedQuote={confirmedQuote}
              setConfirmedQuote={setConfirmedQuote}
            />
          </Route>
          <Route path={RemoveLiquidityRoutePaths.Confirm}>
            {confirmedQuote && <RemoveLiquidityConfirm confirmedQuote={confirmedQuote} />}
          </Route>
          <Route path={RemoveLiquidityRoutePaths.Status}>
            {confirmedQuote && <RemoveLiquidityStatus confirmedQuote={confirmedQuote} />}
          </Route>
          <Route path={RemoveLiquidityRoutePaths.Sweep}>
            {confirmedQuote && (
              <RemoveLiquiditySweep
                confirmedQuote={confirmedQuote}
                onSweepSeen={handleSweepSeen}
                onBack={handleBack}
              />
            )}
          </Route>
        </Switch>
      </Suspense>
    </AnimatePresence>
  )
}
