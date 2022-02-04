import { Box, Stack } from '@chakra-ui/react'
import { FeatureFlagEnum } from 'constants/FeatureFlagEnum'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { useFeature } from 'hooks/useFeature/useFeature'
import { useSortedYearnVaults } from 'hooks/useSortedYearnVaults/useSortedYearnVaults'

import { EarnOpportunityRow } from './EarnOpportunityRow'

export const AllEarnOpportunities = () => {
  const earnFeature = useFeature(FeatureFlagEnum.Yearn)
  const sortedVaults = useSortedYearnVaults()

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
          {sortedVaults.map(vault => (
            <EarnOpportunityRow {...vault} key={vault.vaultAddress} isLoaded={!!vault} />
          ))}
        </Stack>
      </Card.Body>
    </Card>
  )
}
