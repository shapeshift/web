import { Flex, Stack } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import toLower from 'lodash/toLower'
import { useSelector } from 'react-redux'
import { Redirect, useParams } from 'react-router-dom'
import { AssetAccounts } from 'components/AssetAccounts/AssetAccounts'
import { Equity } from 'components/Equity/Equity'
import { MultiHopTrade } from 'components/MultiHopTrade/MultiHopTrade'
import { EarnOpportunities } from 'components/StakingVaults/EarnOpportunities'
import { AssetTransactionHistory } from 'components/TransactionHistory/AssetTransactionHistory'
import { selectWalletAccountIds } from 'state/slices/selectors'

import { AccountBalance } from './AccountBalance'

export type MatchParams = {
  accountId: AccountId
  assetId: AssetId
}

export const AccountToken = () => {
  const { accountId, assetId } = useParams<MatchParams>()

  /**
   * if the user switches the wallet while visiting this page,
   * the accountId is no longer valid for the app,
   * so we'll redirect user to the "accounts" page,
   * in order to choose the account from beginning.
   */
  const accountIds = useSelector(selectWalletAccountIds)
  const isCurrentAccountIdOwner = Boolean(accountIds.map(toLower).includes(toLower(accountId)))
  if (!accountIds.length) return null
  if (!isCurrentAccountIdOwner) return <Redirect to='/accounts' />

  const id = assetId ? decodeURIComponent(assetId) : null
  if (!id) return null
  return (
    <Stack
      alignItems='flex-start'
      spacing={4}
      width='full'
      direction={{ base: 'column', xl: 'row' }}
    >
      <Stack spacing={4} flex='1 1 0%' width='full'>
        <AccountBalance assetId={id} accountId={accountId} />
        <Equity assetId={id} accountId={accountId} />
        <AssetAccounts assetId={id} accountId={accountId} />
        <EarnOpportunities assetId={id} accountId={accountId} />
        <AssetTransactionHistory assetId={id} accountId={accountId} />
      </Stack>
      <Flex
        flexDir='column'
        flex='1 1 0%'
        width='full'
        maxWidth={{ base: 'full', xl: 'sm' }}
        gap={4}
      >
        <MultiHopTrade display={{ base: 'none', md: 'block' }} />
      </Flex>
    </Stack>
  )
}
