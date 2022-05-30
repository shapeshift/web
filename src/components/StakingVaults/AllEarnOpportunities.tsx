import { Box } from '@chakra-ui/react'
import { cosmosChainId, fromAssetId } from '@shapeshiftoss/caip'
import {
  EarnOpportunityType,
  useNormalizeOpportunities,
} from 'features/defi/helpers/normalizeOpportunity'
import qs from 'qs'
import { useCallback } from 'react'
import { useHistory, useLocation } from 'react-router'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { DemoConfig } from 'context/WalletProvider/DemoWallet/config'
import { useModal } from 'hooks/useModal/useModal'
import { useSortedYearnVaults } from 'hooks/useSortedYearnVaults/useSortedYearnVaults'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useCosmosStakingBalances } from 'pages/Defi/hooks/useCosmosStakingBalances'
import { useFoxyBalances } from 'pages/Defi/hooks/useFoxyBalances'

import { StakingTable } from './StakingTable'

export const AllEarnOpportunities = () => {
  const history = useHistory()
  const location = useLocation()
  const {
    state: { isConnected, walletInfo },
    dispatch,
  } = useWallet()
  const sortedVaults = useSortedYearnVaults()
  const { opportunities: foxyRows } = useFoxyBalances()
  const { cosmosStakingOpportunities } = useCosmosStakingBalances({
    assetId: 'cosmos:cosmoshub-4/slip44:118',
  })

  const { cosmosStaking } = useModal()

  const allRows = useNormalizeOpportunities({
    vaultArray: sortedVaults,
    foxyArray: foxyRows,
    cosmosStakingOpportunities,
  })

  const handleClick = useCallback(
    (opportunity: EarnOpportunityType) => {
      const { type, provider, contractAddress, chainId, rewardAddress, assetId } = opportunity
      const { assetReference } = fromAssetId(assetId)
      if (!isConnected && walletInfo?.deviceId !== DemoConfig.name) {
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
        return
      }

      if (chainId === cosmosChainId) {
        cosmosStaking.open({
          assetId,
          validatorAddress: contractAddress,
        })

        return
      }

      history.push({
        pathname: `/defi/${type}/${provider}/overview`,
        search: qs.stringify({
          chainId,
          contractAddress,
          assetReference,
          rewardId: rewardAddress,
        }),
        state: { background: location },
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dispatch, history, isConnected, location],
  )

  return (
    <Card variant='outline' my={6}>
      <Card.Header flexDir='row' display='flex'>
        <Box>
          <Card.Heading>
            <Text translation='defi.earn' />
          </Card.Heading>
          <Text color='gray.500' translation='defi.earnBody' />
        </Box>
      </Card.Header>
      <Card.Body pt={0} px={2}>
        <StakingTable data={allRows} onClick={handleClick} />
      </Card.Body>
    </Card>
  )
}
