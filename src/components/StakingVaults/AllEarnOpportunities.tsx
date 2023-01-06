import { Box } from '@chakra-ui/react'
import {
  cosmosAssetId,
  cosmosChainId,
  fromAssetId,
  osmosisAssetId,
  osmosisChainId,
} from '@shapeshiftoss/caip'
import type { EarnOpportunityType } from 'features/defi/helpers/normalizeOpportunity'
import { useNormalizeOpportunities } from 'features/defi/helpers/normalizeOpportunity'
import qs from 'qs'
import { useCallback, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { useHistory, useLocation } from 'react-router'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { useCosmosSdkStakingBalances } from 'pages/Defi/hooks/useCosmosSdkStakingBalances'
import { useFoxyBalances } from 'pages/Defi/hooks/useFoxyBalances'
import { foxEthLpAssetId, foxEthStakingIds } from 'state/slices/opportunitiesSlice/constants'
import type { StakingId } from 'state/slices/opportunitiesSlice/types'
import {
  selectAggregatedEarnUserLpOpportunity,
  selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
  selectFeatureFlags,
  selectFirstAccountIdByChainId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { StakingTable } from './StakingTable'

// TODO (gomes) delete this after we get resolvers setup

const exampleSaverVault: EarnOpportunityType = {
  contractAddress: '0xa354f35829ae975e850e23e9615b11da1b3dc4de',
  apy: '0.02711977967163448',
  assetId: 'eip155:1/erc20:0xa354f35829ae975e850e23e9615b11da1b3dc4de',
  provider: 'THORChain Savers',
  tvl: '36780518.043089',
  type: 'staking',
  underlyingAssetId: 'eip155:1/erc20:0xa354f35829ae975e850e23e9615b11da1b3dc4de',
  version: '0.4.3',
  expired: false,
  rewardAddress: '0x1234',
  chainId: 'eip155:1',
  cryptoAmountPrecision: '0.721463',
  cryptoAmountBaseUnit: '721463',
  fiatAmount: '0.73911939776344621755',
  isLoaded: true,
  icons: [
    'https://rawcdn.githack.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
  ],
  opportunityName: 'USDC Vault',
}

export const AllEarnOpportunities = () => {
  const history = useHistory()
  const location = useLocation()
  const {
    state: { isConnected, isDemoWallet },
    dispatch,
  } = useWallet()

  const { SaversVaults } = useSelector(selectFeatureFlags)

  const { data: foxyBalancesData } = useFoxyBalances()

  const stakingOpportunities = useAppSelector(
    selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
  )

  const cosmosAccountId = useAppSelector(state =>
    selectFirstAccountIdByChainId(state, cosmosChainId),
  )
  const osmosisAccountId = useAppSelector(state =>
    selectFirstAccountIdByChainId(state, osmosisChainId),
  )

  const foxEthLpOpportunityFilter = useMemo(
    () => ({
      lpId: foxEthLpAssetId,
      assetId: foxEthLpAssetId,
    }),
    [],
  )
  const foxEthLpOpportunity = useAppSelector(state =>
    selectAggregatedEarnUserLpOpportunity(state, foxEthLpOpportunityFilter),
  )
  const { cosmosSdkStakingOpportunities: cosmosStakingOpportunities } = useCosmosSdkStakingBalances(
    {
      assetId: cosmosAssetId,
      accountId: cosmosAccountId,
    },
  )
  const { cosmosSdkStakingOpportunities: osmosisStakingOpportunities } =
    useCosmosSdkStakingBalances({
      assetId: osmosisAssetId,
      accountId: osmosisAccountId,
    })

  const allRows = useNormalizeOpportunities({
    foxyArray: foxyBalancesData?.opportunities ?? [],
    cosmosSdkStakingOpportunities: useMemo(
      () => cosmosStakingOpportunities.concat(osmosisStakingOpportunities),
      [cosmosStakingOpportunities, osmosisStakingOpportunities],
    ),
    foxEthLpOpportunity,
    stakingOpportunities: stakingOpportunities.filter(
      opportunity =>
        !opportunity.expired ||
        (opportunity.expired && bnOrZero(opportunity.cryptoAmountBaseUnit).gt(0)),
    ),
    // TODO (gomes) delete this after we get resolvers setup
    saversVaults: SaversVaults ? [exampleSaverVault] : [],
  })

  const filteredRows = useMemo(
    () =>
      allRows.filter(
        opportunity =>
          foxEthStakingIds.includes(opportunity.assetId as StakingId) ||
          bnOrZero(opportunity.tvl).gte(50000),
      ),
    [allRows],
  )

  const handleClick = useCallback(
    (opportunity: EarnOpportunityType) => {
      const { provider, contractAddress, chainId, rewardAddress, assetId } = opportunity
      const { assetReference } = fromAssetId(assetId)
      const defaultAccountId = assetId === cosmosAssetId ? cosmosAccountId : osmosisAccountId

      if (!isConnected && isDemoWallet) {
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
        return
      }

      history.push({
        pathname: `/defi/earn`,
        search: qs.stringify({
          provider,
          chainId,
          defaultAccountId,
          contractAddress,
          assetReference,
          highestBalanceAccountAddress: opportunity.highestBalanceAccountAddress,
          rewardId: rewardAddress,
          modal: 'overview',
        }),
        state: { background: location },
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dispatch, history, isConnected, location],
  )

  return (
    <Card variant='unstyled' my={6}>
      <Card.Header flexDir='row' display='flex' px={4}>
        <Box>
          <Card.Heading>
            <Text translation='defi.earn' />
          </Card.Heading>
          <Text color='gray.500' translation='defi.earnBody' />
        </Box>
      </Card.Header>
      <Card.Body pt={0} px={0}>
        <StakingTable data={filteredRows} onClick={handleClick} />
      </Card.Body>
    </Card>
  )
}
