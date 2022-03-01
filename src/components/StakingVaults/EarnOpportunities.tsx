import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Box, Button, HStack } from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { FeatureFlag } from 'constants/FeatureFlag'
import {
  EarnOpportunityType,
  useNormalizeOpportunities
} from 'features/defi/helpers/normalizeOpportunity'
import qs from 'qs'
import { NavLink, useHistory, useLocation } from 'react-router-dom'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { useWallet, WalletActions } from 'context/WalletProvider/WalletProvider'
import { useYearnVaults } from 'hooks/useYearnVaults/useYearnVaults'
import { AccountSpecifier } from 'state/slices/portfolioSlice/portfolioSlice'
import { selectAssetByCAIP19 } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { StakingTable } from './StakingTable'

type EarnOpportunitiesProps = {
  tokenId?: string
  assetId: CAIP19
  accountId?: AccountSpecifier
  isLoaded?: boolean
}

export const EarnOpportunities = ({ assetId: caip19 }: EarnOpportunitiesProps) => {
  const earnFeature = FeatureFlag.Yearn
  const history = useHistory()
  const location = useLocation()
  const {
    state: { isConnected },
    dispatch
  } = useWallet()
  const asset = useAppSelector(state => selectAssetByCAIP19(state, caip19))
  const vaults = useYearnVaults()
  //@TODO: This needs to be updated to account for accoundId -- show only vaults that are on that account

  const allRows = useNormalizeOpportunities({
    vaultArray: vaults,
    foxyArray: []
  }).filter(e => e.tokenAddress === asset.tokenId)

  const handleClick = (opportunity: EarnOpportunityType) => {
    const { type, provider, contractAddress, chain, tokenAddress } = opportunity
    if (isConnected) {
      history.push({
        pathname: `/defi/${type}/${provider}/deposit`,
        search: qs.stringify({
          chain,
          contractAddress,
          tokenId: tokenAddress
        }),
        state: { background: location }
      })
    } else {
      dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
    }
  }

  if (!earnFeature || !allRows?.length) return null

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
        <StakingTable data={allRows} onClick={handleClick} />
      </Card.Body>
    </Card>
  )
}
