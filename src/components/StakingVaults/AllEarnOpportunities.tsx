import { Box, Stack } from '@chakra-ui/react'
import { FeatureFlag } from 'constants/FeatureFlag'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { useYearnVaults } from 'hooks/useYearnVaults/useYearnVaults'

import { EarnOpportunityRow } from './EarnOpportunityRow'

export const AllEarnOpportunities = () => {
  const earnFeature = FeatureFlag.Yearn
  const vaults = useYearnVaults()

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
          {vaults.map(vault => (
            <EarnOpportunityRow {...vault} key={vault.vaultAddress} isLoaded={!!vault} />
          ))}
        </Stack>
      </Card.Body>
    </Card>
  )
}
