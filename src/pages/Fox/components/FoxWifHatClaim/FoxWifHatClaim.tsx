import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import React, { lazy, Suspense, useCallback, useMemo, useState } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { Route, Switch } from 'wouter'

import type { FoxWifHatClaimRouteProps } from './types'
import { FoxWifHatClaimRoutePaths } from './types'

import { getFoxWifHatClaimedQueryKey } from '@/pages/Fox/hooks/useFoxWifHatClaimedQuery'
import { useFoxWifHatMerkleTreeQuery } from '@/pages/Fox/hooks/useFoxWifHatMerkleTreeQuery'
import { makeSuspenseful } from '@/utils/makeSuspenseful'

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
  console.log({ location })
  const queryClient = useQueryClient()
  const getFoxWifHatMerkleTreeQuery = useFoxWifHatMerkleTreeQuery()

  const claim = useMemo(() => {
    const claim = getFoxWifHatMerkleTreeQuery.data?.[accountId]
    if (!claim) return null

    return claim
  }, [getFoxWifHatMerkleTreeQuery.data, accountId])

  const [claimTxid, setClaimTxid] = useState<string | undefined>()

  const handleTxConfirmed = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: getFoxWifHatClaimedQueryKey({ index: claim?.index }),
    })
  }, [claim?.index, queryClient])

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
      <Switch location={location.pathname}>
        <Suspense fallback={suspenseFallback}>
          <Route path={FoxWifHatClaimRoutePaths.Confirm}>{renderClaimConfirm()}</Route>
          <Route path={FoxWifHatClaimRoutePaths.Status}>{renderClaimStatus()}</Route>
        </Suspense>
      </Switch>
    </AnimatePresence>
  )
}
