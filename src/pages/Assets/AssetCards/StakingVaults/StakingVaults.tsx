import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Button, Stack } from '@chakra-ui/react'
import { ChainTypes } from '@shapeshiftoss/types'
import { FeatureFlagEnum } from 'constants/FeatureFlagEnum'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { useFeature } from 'hooks/useFeature/useFeature'

import { StakingVaultRow } from './StakingVaultRow'

const vaults = [
  {
    type: 'vault',
    provider: 'yearn',
    contractAddress: '0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9',
    tokenId: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    chain: ChainTypes.Ethereum,
    apr: '0.05',
    fiatAmount: null,
    cryptoAmount: null
  }
]

export const StakingVaults = () => {
  const earnFeature = useFeature(FeatureFlagEnum.Yearn)
  if (!earnFeature) return null

  return (
    <Card>
      <Card.Header>
        <Card.Heading display='flex' alignItems='center'>
          <Text translation={'assets.assetCards.stakingVaults'} />
          <Button size='sm' ml='auto' variant='link' colorScheme='blue'>
            See All <ArrowForwardIcon />
          </Button>
        </Card.Heading>
      </Card.Header>
      <Card.Body pt={0}>
        <Stack spacing={2} mt={2} mx={-4}>
          {vaults.map(vault => (
            <StakingVaultRow {...vault} />
          ))}
        </Stack>
      </Card.Body>
    </Card>
  )
}
