import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Box, Button, Stack } from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { FeatureFlagEnum } from 'constants/FeatureFlagEnum'
import { SUPPORTED_VAULTS } from 'features/earn/providers/yearn/constants/vaults'
import { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { useFeature } from 'hooks/useFeature/useFeature'
import { selectAssetByCAIP19 } from 'state/slices/assetsSlice/assetsSlice'
import { AccountSpecifier } from 'state/slices/portfolioSlice/portfolioSlice'
import { useAppSelector } from 'state/store'

import { StakingVaultRow } from './StakingVaultRow'

type StakingVaultsProps = {
  tokenId?: string
  assetId: CAIP19
  accountId?: AccountSpecifier
  isLoaded?: boolean
}

export const StakingVaults = ({ assetId: caip19 }: StakingVaultsProps) => {
  const earnFeature = useFeature(FeatureFlagEnum.Yearn)
  const asset = useAppSelector(state => selectAssetByCAIP19(state, caip19))
  //@TODO: This needs to be updated to account for accoundId -- show only vaults that are on that account
  const vaults = useMemo(() => {
    if (asset.tokenId) {
      return SUPPORTED_VAULTS.filter(vault => vault.tokenAddress === asset.tokenId)
    } else {
      return []
    }
  }, [asset.tokenId])

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
      </Card.Header>
      <Card.Body pt={0}>
        <Stack spacing={2} mt={2} mx={-4}>
          {vaults.map(vault => (
            <StakingVaultRow {...vault} key={vault.tokenAddress} isLoaded={!!vault} />
          ))}
        </Stack>
      </Card.Body>
    </Card>
  )
}
