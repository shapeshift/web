import { Box, CardBody } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useHistory } from 'react-router'
import { ClaimStatus } from 'components/ClaimRow/types'
import { Text } from 'components/Text'
import { selectArbitrumWithdrawTxs } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ClaimRow } from './ClaimRow'
import { useArbitrumClaimsByStatus } from './hooks/useArbitrumClaimsByStatus'
import { ClaimRoutePaths } from './types'

export const ClaimSelect: React.FC = () => {
  const history = useHistory()

  const arbitrumWithdrawTxs = useAppSelector(selectArbitrumWithdrawTxs)

  console.log({ arbitrumWithdrawTxs })

  const handleClaimClick = useCallback(() => history.push(ClaimRoutePaths.Confirm), [history])

  const { claimsByStatus } = useArbitrumClaimsByStatus(arbitrumWithdrawTxs)

  console.log({ claimsByStatus })

  return (
    <CardBody px={6}>
      <Box mb={6}>
        <Text as='h5' fontSize='md' translation='bridge.availableClaims' />
        {claimsByStatus.Available.map(claim => (
          <ClaimRow claim={claim} status={ClaimStatus.Available} onClaimClick={handleClaimClick} />
        ))}
      </Box>
      <Box mb={6}>
        <Text as='h5' fontSize='md' translation='bridge.pendingClaims' />
        {claimsByStatus.Pending.map(claim => (
          <ClaimRow claim={claim} status={ClaimStatus.Pending} onClaimClick={handleClaimClick} />
        ))}
      </Box>
    </CardBody>
  )
}
