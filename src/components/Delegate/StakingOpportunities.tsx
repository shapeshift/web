import { Stack } from '@chakra-ui/react'

import { useAssetDetails } from '../AssetAccountDetails'
import { StakingOpportunitiesRow } from './StakingOpportunitiesRow'

export const StakingOpportunities = () => {
  const { assetId } = useAssetDetails()

  console.log('%c assetId ', 'background-color: red; color: white;', assetId)

  // TODO: wire up with real validator data
  const validators = [{ id: 1, name: 'Cosmos Validator' }]

  return (
    <Stack spacing={2} mt={2} mx={-4}>
      {validators.map(validator => (
        <StakingOpportunitiesRow name={validator.name} key={validator.id} />
      ))}
    </Stack>
  )
}
