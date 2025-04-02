import type { AccountId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import React, { lazy, Suspense, useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { Route, Switch, useLocation } from 'wouter'

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
  const mixpanel = getMixPanel()
  const [, setLocation] = useLocation()

  return (
    <AnimatePresence mode='wait' initial={false}>
      <Suspense fallback={suspenseFallback}>
        <Switch>
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
                onSweepSeen={() => {
                  if (confirmedQuote.positionStatus?.incomplete) {
                    setLocation(RemoveLiquidityRoutePaths.Status)
                    mixpanel?.track(MixPanelEvent.LpIncompleteWithdrawPreview, confirmedQuote)
                  } else {
                    setLocation(RemoveLiquidityRoutePaths.Confirm)
                    mixpanel?.track(MixPanelEvent.LpWithdrawPreview, confirmedQuote)
                  }
                }}
                onBack={() => setLocation(RemoveLiquidityRoutePaths.Input)}
              />
            )}
          </Route>
          <Route>
            <RemoveLiquidityInput
              headerComponent={headerComponent}
              opportunityId={opportunityId}
              accountId={accountId}
              poolAssetId={poolAssetId}
              confirmedQuote={confirmedQuote}
              setConfirmedQuote={setConfirmedQuote}
            />
          </Route>
        </Switch>
      </Suspense>
    </AnimatePresence>
  )
}
