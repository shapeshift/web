import { HStack, Stack } from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { FeatureFlag } from 'constants/FeatureFlag'
import { Route } from 'Routes/helpers'
import { TxHistory } from 'components/TxHistory'
import { TradeCard } from 'pages/Dashboard/TradeCard'
import { AccountSpecifier } from 'state/slices/portfolioSlice/portfolioSlice'

import { AccountAssets } from './AccountAssets/AccountAssets'
import { AssetAccounts } from './AssetAccounts/AssetAccounts'
import { AssetChart } from './AssetHeader/AssetChart'
import { AssetDescription } from './AssetHeader/AssetDescription'
import { AssetHeader } from './AssetHeader/AssetHeader'
import { AssetMarketData } from './AssetHeader/AssetMarketData'
import { StakingOpportunities } from './Delegate/StakingOpportunities'
import { Main } from './Layout/Main'
import { EarnOpportunities } from './StakingVaults/EarnOpportunities'
import { UnderlyingToken } from './UnderlyingToken'

type AssetDetailsProps = {
  assetId: CAIP19
  accountId?: AccountSpecifier
  route?: Route
}

export const AssetAccountDetails = ({ assetId: caip19, accountId, route }: AssetDetailsProps) => {
  const cosmosInverstorFlag = FeatureFlag.CosmosInvestor
  return (
    <Main route={route} titleComponent={<AssetHeader assetId={caip19} accountId={accountId} />}>
      <HStack alignItems='flex-start' spacing={4} mx='auto'>
        <Stack flex='1 1 0%' maxWidth='sm' spacing={4}>
          <TradeCard />
          <AssetMarketData assetId={caip19} />
          <AssetDescription assetId={caip19} />
        </Stack>
        <Stack spacing={4} flex='1 1 0%'>
          <AssetChart accountId={accountId} assetId={caip19} isLoaded={true} />
          {accountId && <AccountAssets assetId={caip19} accountId={accountId} />}
          <AssetAccounts assetId={caip19} accountId={accountId} />
          <EarnOpportunities assetId={caip19} accountId={accountId} />
          {cosmosInverstorFlag && <StakingOpportunities assetId={caip19} accountId={accountId} />}
          <UnderlyingToken assetId={caip19} accountId={accountId} />
          <TxHistory assetId={caip19} accountId={accountId} />
        </Stack>
      </HStack>
    </Main>
  )
}
