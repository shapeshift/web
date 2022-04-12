import { Box } from '@chakra-ui/react'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { ChainTypes } from '@shapeshiftoss/types'
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
import { useModal } from 'hooks/useModal/useModal'
import { useSortedYearnVaults } from 'hooks/useSortedYearnVaults/useSortedYearnVaults'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useCosmosStakingBalances } from 'pages/Defi/hooks/useCosmosStakingBalances'
import { useFoxyBalances } from 'pages/Defi/hooks/useFoxyBalances'
import { selectFeatureFlag } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { StakingTable } from './StakingTable'

export const AllEarnOpportunities = () => {
  const history = useHistory()
  const location = useLocation()
  const foxyInvestorFeatureFlag = useAppSelector(state => selectFeatureFlag(state, 'FoxyInvestor'))
  const cosmosInvestorFlag = useAppSelector(state => selectFeatureFlag(state, 'CosmosInvestor'))
  const {
    state: { isConnected },
    dispatch,
  } = useWallet()
  const sortedVaults = useSortedYearnVaults()
  const { opportunities } = useFoxyBalances()
  const { activeStakingOpportunities, stakingOpportunities } = useCosmosStakingBalances({
    assetId: 'cosmos:cosmoshub-4/slip44:118',
  })

  const { cosmosGetStarted, cosmosStaking } = useModal()

  const foxyRows = foxyInvestorFeatureFlag ? opportunities : []
  const cosmosActiveStakingOpportunities = cosmosInvestorFlag ? activeStakingOpportunities : []
  const cosmosStakingOpportunities = cosmosInvestorFlag ? stakingOpportunities : []

  const allRows = useNormalizeOpportunities({
    vaultArray: sortedVaults,
    foxyArray: foxyRows,
    cosmosActiveStakingOpportunities,
    cosmosStakingOpportunities,
  })

  const handleClick = useCallback(
    (opportunity: EarnOpportunityType) => {
      const {
        type,
        provider,
        contractAddress,
        chain,
        tokenAddress,
        rewardAddress,
        assetId,
        cryptoAmount,
      } = opportunity
      if (!isConnected) {
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
        return
      }

      if (chain === ChainTypes.Cosmos) {
        if (bnOrZero(cryptoAmount).gt(0)) {
          cosmosStaking.open({
            assetId,
            validatorAddress: contractAddress,
          })
          return
        }

        cosmosGetStarted.open({ assetId })
        return
      }

      history.push({
        pathname: `/defi/${type}/${provider}/overview`,
        search: qs.stringify({
          chain,
          contractAddress,
          tokenId: tokenAddress,
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
