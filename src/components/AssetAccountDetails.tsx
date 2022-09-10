import { Stack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import type { Route } from 'Routes/helpers'
import { AssetTransactionHistory } from 'components/TransactionHistory/AssetTransactionHistory'
import { TradeCard } from 'pages/Dashboard/TradeCard'
import type { AccountSpecifier } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import { selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AccountAssets } from './AccountAssets/AccountAssets'
import { AssetAccounts } from './AssetAccounts/AssetAccounts'
import { AssetChart } from './AssetHeader/AssetChart'
import { AssetDescription } from './AssetHeader/AssetDescription'
import { AssetHeader } from './AssetHeader/AssetHeader'
import { AssetMarketData } from './AssetHeader/AssetMarketData'
import { Main } from './Layout/Main'
import { EarnOpportunities } from './StakingVaults/EarnOpportunities'
import { UnderlyingToken } from './UnderlyingToken'

type AssetDetailsProps = {
  assetId: AssetId
  accountId?: AccountSpecifier
  route?: Route
}

export const AssetAccountDetails = ({ assetId, accountId }: AssetDetailsProps) => {
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
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
          {accountId && <AccountAssets assetId={assetId} accountId={accountId} />}
          <AssetAccounts assetId={assetId} accountId={accountId} />
          <EarnOpportunities assetId={assetId} accountId={accountId} />
          <UnderlyingToken assetId={assetId} accountId={accountId} />
          <AssetTransactionHistory limit={3} assetId={assetId} accountId={accountId} />
        </Stack>
        <Stack flex='1 1 0%' width='full' maxWidth={{ base: 'full', xl: 'sm' }} spacing={4}>
          <TradeCard defaultBuyAssetId={assetId} />
          {marketData && <AssetMarketData assetId={assetId} />}
          <AssetDescription assetId={assetId} />
        </Stack>
      </Stack>
    </Main>
  )
}
