import { Box, CardBody } from '@chakra-ui/react'
import { useCallback } from 'react'
import { fox } from 'test/mocks/assets'
import { ClaimRow } from 'components/ClaimRow/ClaimRow'
import { ClaimStatus } from 'components/ClaimRow/types'
import { Text } from 'components/Text'

export const Claims = () => {
  // TODO: Replace with actual implementation
  const tooltipText = 'tooltip text'
  const actionText = 'Bridge via Arbitrum'
  const statusText = 'status text'
  const stakingAsset = fox
  const handleClaimClick = useCallback(() => {}, [])
  return (
    <CardBody px={6}>
      <Box mb={6}>
        <Text as='h5' fontSize='md' translation='bridge.availableClaims' />
        <ClaimRow
          amountCryptoPrecision={'423.213454'}
          tooltipText={tooltipText}
          // Claim button currently disabled as we don't support dashboard claim button click (yet?)
          onClaimClick={handleClaimClick}
          asset={stakingAsset}
          actionText={actionText}
          statusText={statusText}
          status={ClaimStatus.Available}
        />
      </Box>
      <Box mb={6}>
        <Text as='h5' fontSize='md' translation='bridge.pendingClaims' />
        <ClaimRow
          amountCryptoPrecision={'234.234523'}
          tooltipText={tooltipText}
          // Claim button currently disabled as we don't support dashboard claim button click (yet?)
          onClaimClick={handleClaimClick}
          asset={stakingAsset}
          actionText={actionText}
          statusText={statusText}
          status={ClaimStatus.Pending}
        />
        <ClaimRow
          amountCryptoPrecision={'43.1234'}
          tooltipText={tooltipText}
          // Claim button currently disabled as we don't support dashboard claim button click (yet?)
          onClaimClick={handleClaimClick}
          asset={stakingAsset}
          actionText={actionText}
          statusText={statusText}
          status={ClaimStatus.Pending}
        />
      </Box>
    </CardBody>
  )
}
