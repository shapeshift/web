import { Box, CardBody, Skeleton } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useHistory } from 'react-router'
import { ClaimStatus } from 'components/ClaimRow/types'
import { Text } from 'components/Text'
import { selectArbitrumWithdrawTxs } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ClaimRow } from './ClaimRow'
import type { ClaimDetails } from './hooks/useArbitrumClaimsByStatus'
import { useArbitrumClaimsByStatus } from './hooks/useArbitrumClaimsByStatus'
import { ClaimRoutePaths } from './types'

type ClaimSelectProps = {
  setActiveClaim: (claim: ClaimDetails) => void
}

export const ClaimSelect: React.FC<ClaimSelectProps> = ({ setActiveClaim }) => {
  const history = useHistory()

  const arbitrumWithdrawTxs = useAppSelector(selectArbitrumWithdrawTxs)

  const handleClaimClick = useCallback(
    (claim: ClaimDetails) => {
      setActiveClaim(claim)
      history.push(ClaimRoutePaths.Confirm)
    },
    [history, setActiveClaim],
  )

  const { claimsByStatus, isLoading } = useArbitrumClaimsByStatus(arbitrumWithdrawTxs)

  return (
    <CardBody px={6}>
      <Box mb={6}>
        <Text as='h5' fontSize='md' translation='bridge.availableClaims' />
        {isLoading ? (
          <Skeleton height={16} />
        ) : (
          claimsByStatus.Available.map(claim => (
            <ClaimRow
              claim={claim}
              status={ClaimStatus.Available}
              onClaimClick={handleClaimClick}
            />
          ))
        )}
      </Box>
      <Box mb={6}>
        <Text as='h5' fontSize='md' translation='bridge.pendingClaims' />
        {isLoading ? (
          <Skeleton height={16} />
        ) : (
          claimsByStatus.Pending.map(claim => {
            return (
              <ClaimRow
                claim={claim}
                status={ClaimStatus.Pending}
                onClaimClick={handleClaimClick}
              />
            )
          })
        )}
      </Box>
    </CardBody>
  )
}
