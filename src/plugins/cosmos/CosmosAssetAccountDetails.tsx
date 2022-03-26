import { Stack } from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { AccountAssets } from 'components/AccountAssets/AccountAssets'
import { AssetAccounts } from 'components/AssetAccounts/AssetAccounts'
import { AssetHeader } from 'components/AssetHeader/AssetHeader'
import { StakingOpportunities } from 'components/Delegate/StakingOpportunities'
import { Main } from 'components/Layout/Main'
import { AssetTransactionHistory } from 'components/TransactionHistory/AssetTransactionHistory'
import { AccountSpecifier } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'

import { AssetChart } from '../../components/AssetHeader/AssetChart'
import { AssetDescription } from '../../components/AssetHeader/AssetDescription'
import { AssetMarketData } from '../../components/AssetHeader/AssetMarketData'
import { TradeCard } from '../../pages/Dashboard/TradeCard'
import { selectFeatureFlag } from '../../state/slices/preferencesSlice/selectors'
import { useAppSelector } from '../../state/store'

type AssetDetailsProps = {
  assetId: CAIP19
  accountId?: AccountSpecifier
}

export const CosmosAssetAccountDetails = ({ assetId: caip19, accountId }: AssetDetailsProps) => {
  const cosmosInvestorFlag = useAppSelector(state => selectFeatureFlag(state, 'CosmosInvestor'))

  // TODO: wire up with real validator data
  const stakingOpportunities = [
    { id: 1, validatorName: 'Cosmos Validator', apr: 0.12 },
    {
      id: 2,
      validatorName: 'Cosmos Validator',
      apr: 0.13,
      stakedAmount: '1234',
      fiatAmount: 0.556,
      stakedRewards: '12',
      fiatRewards: 0.01
    },
    {
      id: 3,
      validatorName: 'Cosmos Validator',
      apr: 0.14,
      stakedAmount: '789123',
      fiatAmount: 124.556,
      stakedRewards: '345',
      fiatRewards: 0.14
    }
  ]
  return (
    <Main titleComponent={<AssetHeader assetId={caip19} accountId={accountId} />}>
      <Stack
        alignItems='flex-start'
        spacing={4}
        mx='auto'
        direction={{ base: 'column', xl: 'row' }}
      >
        <Stack spacing={4} flex='1 1 0%' width='full'>
          <AssetChart accountId={accountId} assetId={caip19} isLoaded={true} />
          {accountId && <AccountAssets assetId={caip19} accountId={accountId} />}
          <AssetAccounts assetId={caip19} accountId={accountId} />
          {cosmosInvestorFlag && (
            <StakingOpportunities stakingOpportunities={stakingOpportunities} />
          )}
          <AssetTransactionHistory assetId={caip19} accountId={accountId} />
        </Stack>
        <Stack flex='1 1 0%' width='full' maxWidth={{ base: 'full', xl: 'sm' }} spacing={4}>
          <TradeCard />
          <AssetMarketData assetId={caip19} />
          <AssetDescription assetId={caip19} />
        </Stack>
      </Stack>
    </Main>
  )
}
