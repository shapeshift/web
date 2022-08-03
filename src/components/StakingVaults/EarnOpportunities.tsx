import qs from 'qs'
import { Text } from 'components/Text'
import { Card } from 'components/Card/Card'
import { useAppSelector } from 'state/store'
import { StakingTable } from './StakingTable'
import {
  EarnOpportunityType,
  useNormalizeOpportunities,
} from 'features/defi/helpers/normalizeOpportunity'
import { ArrowForwardIcon } from '@chakra-ui/icons'
import { useWallet } from 'hooks/useWallet/useWallet'
import { Box, Button, HStack } from '@chakra-ui/react'
import { selectAssetById } from 'state/slices/selectors'
import { AssetId, fromAssetId } from '@shapeshiftoss/caip'
import { WalletActions } from 'context/WalletProvider/actions'
import { useFoxyBalances } from 'pages/Defi/hooks/useFoxyBalances'
import { NavLink, useHistory, useLocation } from 'react-router-dom'
import { useVaultBalances } from 'pages/Defi/hooks/useVaultBalances'
import { AccountSpecifier } from 'state/slices/portfolioSlice/portfolioSliceCommon'

type EarnOpportunitiesProps = {
  tokenId?: string
  assetId: AssetId
  accountId?: AccountSpecifier
  isLoaded?: boolean
}

export const EarnOpportunities = ({ assetId }: EarnOpportunitiesProps) => {
  const history = useHistory()
  const location = useLocation()
  const {
    state: { isConnected },
    dispatch,
  } = useWallet()
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const { vaults } = useVaultBalances()
  const { opportunities: foxyRows } = useFoxyBalances()
  //@TODO: This needs to be updated to account for accountId -- show only vaults that are on that account

  const allRows = useNormalizeOpportunities({
    foxyArray: foxyRows,
    vaultArray: Object.values(vaults),
    cosmosSdkStakingOpportunities: [],
  }).filter(row => row.assetId.toLowerCase() === asset.assetId.toLowerCase())

  const handleClick = (opportunity: EarnOpportunityType) => {
    const { provider, contractAddress, chainId, assetId, rewardAddress } = opportunity
    const { assetReference } = fromAssetId(assetId)
    if (!isConnected) {
      dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
      return
    }

    history.push({
      pathname: location.pathname,
      search: qs.stringify({
        chainId,
        contractAddress,
        assetReference,
        rewardId: rewardAddress,
        provider,
        modal: 'overview',
      }),
      state: { background: location },
    })
  }

  if (allRows.length === 0) return null

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
      {Boolean(allRows?.length) && (
        <Card.Body pt={0} px={2}>
          <StakingTable data={allRows} onClick={handleClick} />
        </Card.Body>
      )}
    </Card>
  )
}
