import { Box, CardBody, Skeleton } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import { useHistory } from 'react-router'
import { ClaimStatus } from 'components/ClaimRow/types'
import { Text } from 'components/Text'

import { ClaimRow } from './ClaimRow'
import type { ClaimDetails } from './hooks/useArbitrumClaimsByStatus'
import { useArbitrumClaimsByStatus } from './hooks/useArbitrumClaimsByStatus'
import { ClaimRoutePaths } from './types'

type ClaimSelectProps = {
  setActiveClaim: (claim: ClaimDetails) => void
}

export const ClaimSelect: React.FC<ClaimSelectProps> = ({ setActiveClaim }) => {
  const history = useHistory()

  const handleClaimClick = useCallback(
    (claim: ClaimDetails) => {
      setActiveClaim(claim)
      history.push(ClaimRoutePaths.Confirm)
    },
    [history, setActiveClaim],
  )

  const { claimsByStatus, isLoading } = useArbitrumClaimsByStatus(true)

  const AvailableClaims = useMemo(() => {
    if (isLoading) return <Skeleton height={16} />
    if (!claimsByStatus.Available.length)
      return <Text color='text.subtle' translation={'bridge.noAvailableClaims'} />

    return claimsByStatus.Available.map(claim => (
      <ClaimRow
        key={claim.tx.txid}
        claim={claim}
        status={ClaimStatus.Available}
        onClaimClick={handleClaimClick}
      />
    ))
  }, [claimsByStatus.Available, isLoading, handleClaimClick])

  const PendingClaims = useMemo(() => {
    if (isLoading) return <Skeleton height={16} />
    if (!claimsByStatus.Pending.length)
      return <Text color='text.subtle' translation={'bridge.noPendingClaims'} />

    return claimsByStatus.Pending.map(claim => (
      <ClaimRow
        key={claim.tx.txid}
        claim={claim}
        status={ClaimStatus.Pending}
        onClaimClick={handleClaimClick}
      />
    ))
  }, [claimsByStatus.Pending, isLoading, handleClaimClick])

  return (
    <CardBody px={6}>
      <Box mb={6}>
        <Text as='h5' fontSize='md' translation='bridge.availableClaims' />
        {AvailableClaims}
      </Box>
      <Box>
        <Text as='h5' fontSize='md' translation='bridge.pendingClaims' />
        {PendingClaims}
      </Box>
    </CardBody>
  )
}
