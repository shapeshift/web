import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Box, Button, HStack, Stack } from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { FeatureFlagEnum } from 'constants/FeatureFlagEnum'
import { SUPPORTED_VAULTS } from 'features/defi/providers/yearn/constants/vaults'
import { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { useFeature } from 'hooks/useFeature/useFeature'
import { selectAssetByCAIP19 } from 'state/slices/assetsSlice/assetsSlice'
import { AccountSpecifier } from 'state/slices/portfolioSlice/portfolioSlice'
import { useAppSelector } from 'state/store'

import { EarnOpportunityRow } from './EarnOpportunityRow'

type EarnOpportunitiesProps = {
  tokenId?: string
  assetId: CAIP19
  accountId?: AccountSpecifier
  isLoaded?: boolean
}

export const EarnOpportunities = ({ assetId: caip19 }: EarnOpportunitiesProps) => {
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
        <HStack gap={6}>
          <Box>
            <Card.Heading>
              <Text translation='defi.earn' />
            </Card.Heading>
            <Text color='gray.500' translation='defi.earnBody' />
          </Box>

          <Button size='sm' variant='link' colorScheme='blue' as={NavLink} to='/defi/earn'>
            <Text translation='common.seeAll' /> <ArrowForwardIcon />
          </Button>
        </HStack>
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
