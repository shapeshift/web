import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Box, Button, HStack, Table, Tbody } from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { FeatureFlag } from 'constants/FeatureFlag'
import { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { useYearnVaults } from 'hooks/useYearnVaults/useYearnVaults'
import { AccountSpecifier } from 'state/slices/portfolioSlice/portfolioSlice'
import { selectAssetByCAIP19 } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { EarnOpportunityRow } from './EarnOpportunityRow'
import { EarnTableHeader } from './EarnTableHeader'

type EarnOpportunitiesProps = {
  tokenId?: string
  assetId: CAIP19
  accountId?: AccountSpecifier
  isLoaded?: boolean
}

export const EarnOpportunities = ({ assetId: caip19 }: EarnOpportunitiesProps) => {
  const earnFeature = FeatureFlag.Yearn
  const asset = useAppSelector(state => selectAssetByCAIP19(state, caip19))
  const vaults = useYearnVaults()
  //@TODO: This needs to be updated to account for accoundId -- show only vaults that are on that account

  const vaultRows = useMemo(
    () =>
      vaults
        .filter(vault => vault.tokenAddress === asset.tokenId)
        .map((vault, index) => {
          return (
            <EarnOpportunityRow
              {...vault}
              key={vault.vaultAddress}
              index={index + 1}
              isLoaded={!!vault}
            />
          )
        }),
    [asset.tokenId, vaults]
  )

  if (!earnFeature || !vaults?.length) return null

  return (
    <Card>
      <Card.Header flexDir='row' display='flex'>
        <HStack gap={6} width='full'>
          <Box>
            <Card.Heading>
              <Text translation='defi.earn' />
            </Card.Heading>
            <Text color='gray.500' translation='defi.earnBody' />
          </Box>
          <Box flex={1} textAlign='right'>
            <Button
              size='sm'
              variant='link'
              colorScheme='blue'
              ml='auto'
              as={NavLink}
              to='/defi/earn'
            >
              <Text translation='common.seeAll' /> <ArrowForwardIcon />
            </Button>
          </Box>
        </HStack>
      </Card.Header>
      <Card.Body pt={0} px={2}>
        <Table variant='clickable'>
          <EarnTableHeader />
          <Tbody>{vaultRows}</Tbody>
        </Table>
      </Card.Body>
    </Card>
  )
}
