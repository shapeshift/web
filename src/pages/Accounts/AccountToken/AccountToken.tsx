import type { StackDirection } from '@chakra-ui/react'
import { Flex, Stack } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import toLower from 'lodash/toLower'
import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { Navigate, useParams } from 'react-router-dom'

import { AccountBalance } from './AccountBalance'

import { AssetAccounts } from '@/components/AssetAccounts/AssetAccounts'
import { Equity } from '@/components/Equity/Equity'
import { EarnOpportunities } from '@/components/StakingVaults/EarnOpportunities'
import { AssetTransactionHistory } from '@/components/TransactionHistory/AssetTransactionHistory'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { StandaloneTrade } from '@/pages/Trade/StandaloneTrade'
import { selectEnabledWalletAccountIds } from '@/state/slices/selectors'

export type MatchParams = {
  accountId: AccountId
  chainId: string
  assetSubId: string
}

const stackDirection: StackDirection = { base: 'column', xl: 'row' }
const flexMaxWidth = { base: 'full', xl: 'sm' }
const multiHopTradeDisplay = { base: 'none', md: 'flex' }

export const AccountToken = () => {
  const { accountId, chainId, assetSubId } = useParams<MatchParams>()

  /**
   * if the user switches the wallet while visiting this page,
   * the accountId is no longer valid for the app,
   * so we'll redirect user to the "accounts" page,
   * in order to choose the account from beginning.
   */
  const accountIds = useSelector(selectEnabledWalletAccountIds)
  const isCurrentAccountIdOwner = Boolean(accountIds.map(toLower).includes(toLower(accountId)))

  const assetId = useMemo(() => {
    if (!chainId || !assetSubId) return null
    return `${decodeURIComponent(chainId)}/${decodeURIComponent(assetSubId)}`
  }, [chainId, assetSubId])

  const nativeSellAssetId = useMemo(() => {
    if (!assetId) return
    return getChainAdapterManager().get(fromAssetId(assetId).chainId)?.getFeeAssetId()
  }, [assetId])

  if (!accountIds.length) return null
  if (!isCurrentAccountIdOwner) return <Navigate to='/accounts' replace />

  if (!assetId) return null
  if (!accountId) return null

  return (
    <Stack alignItems='flex-start' spacing={4} width='full' direction={stackDirection}>
      <Stack spacing={4} flex='1 1 0%' width='full'>
        <AccountBalance assetId={assetId} accountId={accountId} />
        <Equity assetId={assetId} accountId={accountId} />
        <AssetAccounts assetId={assetId} accountId={accountId} />
        <EarnOpportunities assetId={assetId} accountId={accountId} />
        <AssetTransactionHistory assetId={assetId} accountId={accountId} />
      </Stack>
      <Flex
        flexDir='column'
        flex='1 1 0%'
        width='full'
        maxWidth={flexMaxWidth}
        gap={4}
        display={multiHopTradeDisplay}
      >
        <StandaloneTrade
          isCompact
          defaultBuyAssetId={assetId}
          defaultSellAssetId={nativeSellAssetId}
        />
      </Flex>
    </Stack>
  )
}
