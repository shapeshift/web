import { Stack } from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { FeatureFlag } from 'constants/FeatureFlag'
import { AccountAssets } from 'components/AccountAssets/AccountAssets'
import { AssetAccounts } from 'components/AssetAccounts/AssetAccounts'
import { AssetHeader } from 'components/AssetHeader/AssetHeader'
import { StakingOpportunities } from 'components/Delegate/StakingOpportunities'
import { Main } from 'components/Layout/Main'
import { TxHistory } from 'components/TxHistory'
import { AccountSpecifier } from 'state/slices/portfolioSlice/portfolioSlice'

import { AssetChart } from '../../components/AssetHeader/AssetChart'
import { AssetDescription } from '../../components/AssetHeader/AssetDescription'
import { AssetMarketData } from '../../components/AssetHeader/AssetMarketData'
import { TradeCard } from '../../pages/Dashboard/TradeCard'

type AssetDetailsProps = {
  assetId: CAIP19
  accountId?: AccountSpecifier
}

export const CosmosAssetAccountDetails = ({ assetId: caip19, accountId }: AssetDetailsProps) => {
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
          {FeatureFlag.CosmosInvestor && <StakingOpportunities />}
          <TxHistory assetId={caip19} accountId={accountId} />
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
