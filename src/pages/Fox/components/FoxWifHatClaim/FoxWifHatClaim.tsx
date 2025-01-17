import { AnimatePresence } from 'framer-motion'
import { lazy, Suspense, useCallback, useState } from 'react'
import { MemoryRouter, Route, Switch, useLocation } from 'react-router'
import { makeSuspenseful } from 'utils/makeSuspenseful'

import type { FoxWifHatClaimRouteProps } from './types'
import { FoxWifHatClaimRoutePaths } from './types'

const suspenseFallback = <div>Loading...</div>

const defaultBoxSpinnerStyle = {
  height: '500px',
}

const FoxWifHatClaimConfirm = makeSuspenseful(
  lazy(() =>
    import('./FoxWifHatClaimConfirm').then(({ FoxWifHatClaimConfirm }) => ({
      default: FoxWifHatClaimConfirm,
    })),
  ),
  defaultBoxSpinnerStyle,
)

const FoxWifHatClaimStatus = makeSuspenseful(
  lazy(() =>
    import('./FoxWifHatClaimStatus').then(({ FoxWifHatClaimStatus }) => ({
      default: FoxWifHatClaimStatus,
    })),
  ),
  defaultBoxSpinnerStyle,
)

const FoxWifHatClaimEntries = [FoxWifHatClaimRoutePaths.Confirm, FoxWifHatClaimRoutePaths.Status]

export const FoxWifHatClaim: React.FC<FoxWifHatClaimRouteProps> = ({ accountId }) => {
  return (
    <MemoryRouter initialEntries={FoxWifHatClaimEntries} initialIndex={0}>
      <FoxWifHatClaimRoutes accountId={accountId} />
    </MemoryRouter>
  )
}

export const FoxWifHatClaimRoutes: React.FC<FoxWifHatClaimRouteProps> = ({ accountId }) => {
  const location = useLocation()

  const [claimTxid, setClaimTxid] = useState<string | undefined>()

  // @TODO: implement tx confirmed
  const handleTxConfirmed = useCallback(async () => {
    await new Promise(resolve => setTimeout(resolve, 1000))
    console.log('tx confirmed')
  }, [])

  const renderClaimConfirm = useCallback(() => {
    return (
      <FoxWifHatClaimConfirm
        accountId={accountId}
        setClaimTxid={setClaimTxid}
        claimTxid={claimTxid}
      />
    )
  }, [claimTxid, accountId])

  const renderClaimStatus = useCallback(() => {
    if (!claimTxid) return null

    return (
      <FoxWifHatClaimStatus
        accountId={accountId}
        txId={claimTxid}
        setClaimTxid={setClaimTxid}
        onTxConfirmed={handleTxConfirmed}
      />
    )
  }, [claimTxid, handleTxConfirmed, accountId])

  return (
    <AnimatePresence mode='wait' initial={false}>
      <Switch location={location}>
        <Suspense fallback={suspenseFallback}>
          <Route
            key={FoxWifHatClaimRoutePaths.Confirm}
            path={FoxWifHatClaimRoutePaths.Confirm}
            render={renderClaimConfirm}
          />
          <Route
            key={FoxWifHatClaimRoutePaths.Status}
            path={FoxWifHatClaimRoutePaths.Status}
            render={renderClaimStatus}
          />
        </Suspense>
      </Switch>
    </AnimatePresence>
  )
}
