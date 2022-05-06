import { Stack } from '@chakra-ui/react'
import { AssetId } from '@shapeshiftoss/caip'
import { Route } from 'Routes/helpers'
import { AssetTransactionHistory } from 'components/TransactionHistory/AssetTransactionHistory'
import { TradeCard } from 'pages/Dashboard/TradeCard'
import { AccountSpecifier } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
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

export const AssetAccountDetails = ({ assetId: caip19, accountId }: AssetDetailsProps) => {
  const marketData = useAppSelector(state => selectMarketDataById(state, caip19))
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
          <EarnOpportunities assetId={caip19} accountId={accountId} />
          <UnderlyingToken assetId={caip19} accountId={accountId} />
          <AssetTransactionHistory limit={3} assetId={caip19} accountId={accountId} />
        </Stack>
        <Stack flex='1 1 0%' width='full' maxWidth={{ base: 'full', xl: 'sm' }} spacing={4}>
          <TradeCard />
          {marketData && <AssetMarketData assetId={caip19} />}
          <AssetDescription assetId={caip19} />
        </Stack>
      </Stack>
    </Main>
  )
}
