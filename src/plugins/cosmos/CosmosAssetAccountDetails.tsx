import { Stack } from '@chakra-ui/react'
import { AssetId } from '@shapeshiftoss/caip'
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

type AssetDetailsProps = {
  assetId: AssetId
  accountId?: AccountSpecifier
}

export const CosmosAssetAccountDetails = ({ assetId, accountId }: AssetDetailsProps) => (
  <Main titleComponent={<AssetHeader assetId={assetId} accountId={accountId} />}>
    <Stack alignItems='flex-start' spacing={4} mx='auto' direction={{ base: 'column', xl: 'row' }}>
      <Stack spacing={4} flex='1 1 0%' width='full'>
        <AssetChart accountId={accountId} assetId={assetId} isLoaded={true} />
        {accountId && <AccountAssets assetId={assetId} accountId={accountId} />}
        <AssetAccounts assetId={assetId} accountId={accountId} />
        <StakingOpportunities assetId={assetId} />
        <AssetTransactionHistory assetId={assetId} accountId={accountId} />
      </Stack>
      <Stack flex='1 1 0%' width='full' maxWidth={{ base: 'full', xl: 'sm' }} spacing={4}>
        <TradeCard />
        <AssetMarketData assetId={assetId} />
        <AssetDescription assetId={assetId} />
      </Stack>
    </Stack>
  </Main>
)
