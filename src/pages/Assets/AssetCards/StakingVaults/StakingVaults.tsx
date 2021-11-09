import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Box, Button, Center, Stack } from '@chakra-ui/react'
import { FeatureFlagEnum } from 'constants/FeatureFlagEnum'
import { useMemo } from 'react'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { SUPPORTED_VAULTS } from 'context/EarnManagerProvider/providers/yearn/constants/vaults'
import { useFeature } from 'hooks/useFeature/useFeature'

import { StakingVaultRow } from './StakingVaultRow'

type StakingVaultsProps = {
  tokenId?: string
  isLoaded: boolean
}

export const StakingVaults = ({ tokenId, isLoaded }: StakingVaultsProps) => {
  const earnFeature = useFeature(FeatureFlagEnum.Yearn)

  const VAULTS = useMemo(() => {
    if (tokenId) {
      return SUPPORTED_VAULTS.filter(vault => vault.tokenAddress === tokenId)
    } else {
      return SUPPORTED_VAULTS
    }
  }, [tokenId])

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
        {VAULTS.length > 0 && (
          <Button size='sm' ml='auto' variant='link' colorScheme='blue'>
            <Text translation='common.seeAll' /> <ArrowForwardIcon />
          </Button>
        )}
      </Card.Header>
      <Card.Body pt={0}>
        <Stack spacing={2} mt={2} mx={-4}>
          {VAULTS.map((vault, index) => (
            <StakingVaultRow {...vault} isLoaded={isLoaded} key={index} />
          ))}
        </Stack>
        {VAULTS.length === 0 && (
          <Center flexDir='column' py={6}>
            <Text translation='earn.emptyVaults' color='gray.500' />
            <Button variant='ghost-filled' colorScheme='blue' mt={2}>
              <Text translation='common.seeAll' />
            </Button>
          </Center>
        )}
      </Card.Body>
    </Card>
  )
}
