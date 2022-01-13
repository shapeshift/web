import { Box, Stack } from '@chakra-ui/react'
import { FeatureFlagEnum } from 'constants/FeatureFlagEnum'
import { SUPPORTED_VAULTS } from 'features/earn/providers/yearn/constants/vaults'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { useFeature } from 'hooks/useFeature/useFeature'

import { StakingVaultRow } from './StakingVaultRow'

export const AllVaults = () => {
  const earnFeature = useFeature(FeatureFlagEnum.Yearn)

  if (!earnFeature) return null

  return (
    <Card>
      <Card.Header flexDir='row' display='flex'>
        <Box>
          <Card.Heading>
            <Text translation='assets.assetCards.stakingVaults' />
          </Card.Heading>
          <Text color='gray.500' translation='assets.assetCards.stakingBody' />
        </Box>
      </Card.Header>
      <Card.Body pt={0}>
        <Stack spacing={2} mt={2} mx={-4}>
          {SUPPORTED_VAULTS.map(vault => (
            <StakingVaultRow {...vault} key={vault.tokenAddress} isLoaded={!!vault} />
          ))}
        </Stack>
      </Card.Body>
    </Card>
  )
}
