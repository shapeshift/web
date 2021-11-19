import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Box, Button, Stack } from '@chakra-ui/react'
import { FeatureFlagEnum } from 'constants/FeatureFlagEnum'
import { SUPPORTED_VAULTS } from 'features/earn/providers/yearn/constants/vaults'
import { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { useFeature } from 'hooks/useFeature/useFeature'

import { StakingVaultRow } from './StakingVaultRow'

type StakingVaultsProps = {
  tokenId?: string
  isLoaded: boolean
  showAll?: boolean
}

export const StakingVaults = ({ isLoaded, tokenId, showAll = false }: StakingVaultsProps) => {
  const earnFeature = useFeature(FeatureFlagEnum.Yearn)

  const vaults = useMemo(() => {
    if (tokenId) {
      return SUPPORTED_VAULTS.filter(vault => vault.tokenAddress === tokenId)
    } else if (showAll) {
      return SUPPORTED_VAULTS
    } else {
      return []
    }
  }, [tokenId, showAll])

  if (!earnFeature || vaults.length === 0) return null

  return (
    <Card>
      <Card.Header flexDir='row' display='flex'>
        <Box>
          <Card.Heading>
            <Text translation='assets.assetCards.stakingVaults' />
          </Card.Heading>
          <Text color='gray.500' translation='assets.assetCards.stakingBody' />
        </Box>
        {!showAll && (
          <Button
            size='sm'
            ml='auto'
            variant='link'
            colorScheme='blue'
            as={NavLink}
            to='/earn/staking-vaults'
          >
            <Text translation='common.seeAll' /> <ArrowForwardIcon />
          </Button>
        )}
      </Card.Header>
      <Card.Body pt={0}>
        <Stack spacing={2} mt={2} mx={-4}>
          {vaults.map(vault => (
            <StakingVaultRow {...vault} key={vault.tokenAddress} isLoaded={isLoaded} />
          ))}
        </Stack>
      </Card.Body>
    </Card>
  )
}
