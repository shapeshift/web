import { Card } from '@chakra-ui/react'
import type { TxStatus } from '@shapeshiftoss/unchained-client'
import { useCallback, useEffect, useState } from 'react'
import { Route, Switch, useHistory, useLocation } from 'react-router-dom'

import { SharedTradeInputHeader } from '../../../SharedTradeInput/SharedTradeInputHeader'
import { ClaimConfirm } from './ClaimConfirm'
import { ClaimSelect } from './ClaimSelect'
import { ClaimStatus } from './ClaimStatus'
import type { ClaimDetails } from './hooks/useArbitrumClaimsByStatus'
import { ClaimRoutePaths } from './types'

export const Claim = () => {
  const location = useLocation()
  const history = useHistory()

  const [activeClaim, setActiveClaim] = useState<ClaimDetails | undefined>()
  const [claimTxHash, setClaimTxHash] = useState<string | undefined>()
  const [claimTxStatus, setClaimTxStatus] = useState<TxStatus | undefined>()

  // Redirect to the Select route when the component mounts
  useEffect(() => {
    // Only redirect if we're exactly on the /trade/claim route
    if (location.pathname === '/trade/claim') {
      history.replace(ClaimRoutePaths.Select)
    }
  }, [history, location.pathname])

  const renderClaimSelect = useCallback(() => {
    return <ClaimSelect setActiveClaim={setActiveClaim} />
  }, [])

  const renderClaimConfirm = useCallback(() => {
    if (!activeClaim) return null

    return (
      <ClaimConfirm
        activeClaim={activeClaim}
        setClaimTxHash={setClaimTxHash}
        setClaimTxStatus={setClaimTxStatus}
      />
    )
  }, [activeClaim, setClaimTxHash, setClaimTxStatus])

  const renderClaimStatus = useCallback(() => {
    if (!activeClaim) return null
    if (!claimTxHash) return null
    if (!claimTxStatus) return null

    return (
      <ClaimStatus
        activeClaim={activeClaim}
        claimTxHash={claimTxHash}
        claimTxStatus={claimTxStatus}
      />
    )
  }, [activeClaim, claimTxHash, claimTxStatus])

  return (
    <Card flex={1} width='full' maxWidth='500px'>
      <SharedTradeInputHeader />
      <Switch location={location}>
        <Route
          path={ClaimRoutePaths.Select}
          render={renderClaimSelect}
        />
        <Route
          path={ClaimRoutePaths.Confirm}
          render={renderClaimConfirm}
        />
        <Route
          path={ClaimRoutePaths.Status}
          render={renderClaimStatus}
        />
      </Switch>
    </Card>
  )
}
