import { Box, Stack } from '@chakra-ui/react'
import { FeatureFlagEnum } from 'constants/FeatureFlagEnum'
import { SUPPORTED_VAULTS } from 'features/defi/providers/yearn/constants/vaults'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { useFeature } from 'hooks/useFeature/useFeature'

import { EarnOpportunityRow } from './EarnOpportunityRow'

export const AllEarnOpportunities = () => {
  const earnFeature = useFeature(FeatureFlagEnum.Yearn)

  if (!earnFeature) return null

  return (
    <Card>
      <Card.Header flexDir='row' display='flex'>
        <Box>
          <Card.Heading>
            <Text translation='defi.earn' />
          </Card.Heading>
          <Text color='gray.500' translation='defi.earnBody' />
        </Box>
      </Card.Header>
      <Card.Body pt={0}>
        <Stack spacing={2} mt={2} mx={-4}>
          {SUPPORTED_VAULTS.map(vault => (
            <EarnOpportunityRow {...vault} key={vault.tokenAddress} isLoaded={!!vault} />
          ))}
        </Stack>
      </Card.Body>
    </Card>
  )
}
