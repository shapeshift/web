import { Flex, Stack } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import type { Route } from 'Routes/helpers'
import { AssetTransactionHistory } from 'components/TransactionHistory/AssetTransactionHistory'
import { TradeCard } from 'pages/Dashboard/TradeCard'
import { isUtxoAccountId } from 'state/slices/portfolioSlice/utils'

import { AccountAssets } from './AccountAssets/AccountAssets'
import { AssetAccounts } from './AssetAccounts/AssetAccounts'
import { Main } from './Layout/Main'
import { RelatedAssets } from './RelatedAssets/RelatedAssets'
import { EarnOpportunities } from './StakingVaults/EarnOpportunities'

type AccountDetailsProps = {
  assetId: AssetId
  accountId?: AccountId
  route?: Route
}

export const AccountDetails = ({ assetId, accountId }: AccountDetailsProps) => {
  if (!accountId || !assetId) return null
  return (
    <Main>
      <Stack
        alignItems='flex-start'
        spacing={4}
        mx='auto'
        direction={{ base: 'column', xl: 'row' }}
      >
        <Stack spacing={4} flex='1 1 0%' width='full'>
          {accountId && <AccountAssets assetId={assetId} accountId={accountId} />}
          <RelatedAssets assetId={assetId} />
          <AssetAccounts
            assetId={assetId}
            accountId={isUtxoAccountId(accountId) ? '' : accountId}
          />
          <EarnOpportunities assetId={assetId} accountId={accountId} />
          <AssetTransactionHistory limit={10} assetId={assetId} accountId={accountId} />
        </Stack>
        <Flex
          flexDir='column'
          flex='1 1 0%'
          width='full'
          maxWidth={{ base: 'full', xl: 'sm' }}
          gap={4}
        >
          <TradeCard defaultBuyAssetId={assetId} display={{ base: 'none', md: 'block' }} />
        </Flex>
      </Stack>
    </Main>
  )
}
