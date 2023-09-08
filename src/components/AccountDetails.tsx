import { Flex, Stack } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { useTranslate } from 'react-polyglot'
import type { Route } from 'Routes/helpers'
import { MultiHopTrade } from 'components/MultiHopTrade/MultiHopTrade'
import { AssetTransactionHistory } from 'components/TransactionHistory/AssetTransactionHistory'
import { AccountBalance } from 'pages/Accounts/AccountToken/AccountBalance'
import { isUtxoAccountId } from 'state/slices/portfolioSlice/utils'

import { AccountAssets } from './AccountAssets/AccountAssets'
import { AssetAccounts } from './AssetAccounts/AssetAccounts'
import { Equity } from './Equity/Equity'
import { RelatedAssets } from './RelatedAssets/RelatedAssets'
import { EarnOpportunities } from './StakingVaults/EarnOpportunities'

type AccountDetailsProps = {
  assetId: AssetId
  accountId?: AccountId
  route?: Route
}

export const AccountDetails = ({ assetId, accountId }: AccountDetailsProps) => {
  const translate = useTranslate()
  if (!accountId || !assetId) return null
  return (
    <Stack
      width='full'
      alignItems='flex-start'
      spacing={4}
      mx='auto'
      direction={{ base: 'column', xl: 'row' }}
    >
      <Stack spacing={4} flex='1 1 0%' width='full'>
        <AccountBalance
          assetId={assetId}
          accountId={accountId}
          backPath='/dashboard/accounts'
          backLabel={translate('navBar.accounts')}
        />
        <Equity assetId={assetId} accountId={accountId} />
        {accountId && <AccountAssets assetId={assetId} accountId={accountId} />}
        <RelatedAssets assetId={assetId} />
        <AssetAccounts assetId={assetId} accountId={isUtxoAccountId(accountId) ? '' : accountId} />
        <EarnOpportunities assetId={assetId} accountId={accountId} />
        <AssetTransactionHistory limit={10} assetId={assetId} accountId={accountId} />
      </Stack>
      <Flex
        flexDir='column'
        flex='1 1 0%'
        width='full'
        maxWidth={{ base: 'full', xl: 'md' }}
        gap={4}
      >
        <MultiHopTrade display={{ base: 'none', md: 'block' }} />
      </Flex>
    </Stack>
  )
}
