import { Stack } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@keepkey/caip'
import { fromAssetId } from '@keepkey/caip'
import { useMemo } from 'react'
import { AccountAssets } from 'components/AccountAssets/AccountAssets'
import { AssetAccounts } from 'components/AssetAccounts/AssetAccounts'
import { AssetHeader } from 'components/AssetHeader/AssetHeader'
import { StakingOpportunities } from 'components/Delegate/StakingOpportunities'
import { Main } from 'components/Layout/Main'
import { MaybeChartUnavailable } from 'components/MaybeChartUnavailable'
import { AssetTransactionHistory } from 'components/TransactionHistory/AssetTransactionHistory'

import { AssetChart } from '../../components/AssetHeader/AssetChart'
import { AssetDescription } from '../../components/AssetHeader/AssetDescription'
import { AssetMarketData } from '../../components/AssetHeader/AssetMarketData'
import { TradeCard } from '../../pages/Dashboard/TradeCard'
import { supportsStaking } from './components/modals/Staking/StakingCommon'

type AssetDetailsProps = {
  assetId: AssetId
  accountId?: AccountId
}

export const CosmosAssetAccountDetails = ({ assetId, accountId }: AssetDetailsProps) => {
  const assetIds = useMemo(() => [assetId], [assetId])
  return (
    <Main titleComponent={<AssetHeader assetId={assetId} accountId={accountId} />}>
      <Stack
        alignItems='flex-start'
        spacing={4}
        mx='auto'
        direction={{ base: 'column', xl: 'row' }}
      >
        <Stack spacing={4} flex='1 1 0%' width='full'>
          <AssetChart accountId={accountId} assetId={assetId} isLoaded={true} />
          <MaybeChartUnavailable assetIds={assetIds} />
          {accountId && <AccountAssets assetId={assetId} accountId={accountId} />}
          <AssetAccounts assetId={assetId} accountId={accountId} />
          {supportsStaking(fromAssetId(assetId).chainId) && (
            <StakingOpportunities accountId={accountId} assetId={assetId} />
          )}
          <AssetTransactionHistory assetId={assetId} accountId={accountId} />
        </Stack>
        <Stack flex='1 1 0%' width='full' maxWidth={{ base: 'full', xl: 'sm' }} spacing={4}>
          <TradeCard defaultBuyAssetId={assetId} />
          <AssetMarketData assetId={assetId} />
          <AssetDescription assetId={assetId} />
        </Stack>
      </Stack>
    </Main>
  )
}
