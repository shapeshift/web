import type { StackDirection } from '@chakra-ui/react'
import { Flex, Stack } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import toLower from 'lodash/toLower'
import { useCallback, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { Redirect, useHistory, useParams } from 'react-router-dom'

import { AccountBalance } from './AccountBalance'

import { AssetAccounts } from '@/components/AssetAccounts/AssetAccounts'
import { Equity } from '@/components/Equity/Equity'
import { LimitOrderRoutePaths } from '@/components/MultiHopTrade/components/LimitOrder/types'
import { MultiHopTrade } from '@/components/MultiHopTrade/MultiHopTrade'
import { TradeInputTab, TradeRoutePaths } from '@/components/MultiHopTrade/types'
import { EarnOpportunities } from '@/components/StakingVaults/EarnOpportunities'
import { AssetTransactionHistory } from '@/components/TransactionHistory/AssetTransactionHistory'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { ClaimRoutePaths } from '@/pages/RFOX/components/Claim/types'
import { selectEnabledWalletAccountIds } from '@/state/slices/selectors'

export type MatchParams = {
  accountId: AccountId
  assetId: AssetId
}

const stackDirection: StackDirection = { base: 'column', xl: 'row' }
const flexMaxWidth = { base: 'full', xl: 'sm' }
const multiHopTradeDisplay = { base: 'none', md: 'flex' }

export const AccountToken = () => {
  const history = useHistory()
  const { accountId, assetId } = useParams<MatchParams>()

  /**
   * if the user switches the wallet while visiting this page,
   * the accountId is no longer valid for the app,
   * so we'll redirect user to the "accounts" page,
   * in order to choose the account from beginning.
   */
  const accountIds = useSelector(selectEnabledWalletAccountIds)
  const isCurrentAccountIdOwner = Boolean(accountIds.map(toLower).includes(toLower(accountId)))

  const id = assetId ? decodeURIComponent(assetId) : null

  const nativeSellAssetId = useMemo(() => {
    if (!id) return
    return getChainAdapterManager().get(fromAssetId(id).chainId)?.getFeeAssetId()
  }, [id])

  const handleChangeTab = useCallback(
    (newTab: TradeInputTab) => {
      switch (newTab) {
        case TradeInputTab.Trade:
          history.push(TradeRoutePaths.Input)
          break
        case TradeInputTab.LimitOrder:
          history.push(LimitOrderRoutePaths.Input)
          break
        case TradeInputTab.Claim:
          history.push(ClaimRoutePaths.Select)
          break
        default:
          break
      }
    },
    [history],
  )

  if (!accountIds.length) return null
  if (!isCurrentAccountIdOwner) return <Redirect to='/accounts' />

  if (!id) return null

  return (
    <Stack alignItems='flex-start' spacing={4} width='full' direction={stackDirection}>
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
        maxWidth={flexMaxWidth}
        gap={4}
        display={multiHopTradeDisplay}
      >
        <MultiHopTrade
          isCompact
          defaultBuyAssetId={id}
          defaultSellAssetId={nativeSellAssetId}
          onChangeTab={handleChangeTab}
        />
      </Flex>
    </Stack>
  )
}
