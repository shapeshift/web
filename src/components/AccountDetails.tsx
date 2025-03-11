import type { StackDirection } from '@chakra-ui/react'
import { Flex, Stack } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { ethAssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'

import { AccountAssets } from './AccountAssets/AccountAssets'
import { AssetAccounts } from './AssetAccounts/AssetAccounts'
import { Equity } from './Equity/Equity'
import { LimitOrderRoutePaths } from './MultiHopTrade/components/LimitOrder/types'
import { ClaimRoutePaths } from './MultiHopTrade/components/TradeInput/components/Claim/types'
import { TradeInputTab, TradeRoutePaths } from './MultiHopTrade/types'
import { RelatedAssets } from './RelatedAssets/RelatedAssets'
import { EarnOpportunities } from './StakingVaults/EarnOpportunities'

import { MultiHopTrade } from '@/components/MultiHopTrade/MultiHopTrade'
import { AssetTransactionHistory } from '@/components/TransactionHistory/AssetTransactionHistory'
import { isUtxoAccountId } from '@/lib/utils/utxo'
import { AccountBalance } from '@/pages/Accounts/AccountToken/AccountBalance'
import type { Route } from '@/Routes/helpers'

type AccountDetailsProps = {
  assetId: AssetId
  accountId?: AccountId
  route?: Route
}

const directionXlRow: StackDirection = { base: 'column', xl: 'row' }
const flexMaxWidth = { base: 'full', xl: 'md' }
const displayMdBlock = { base: 'none', md: 'flex' }

export const AccountDetails = ({ assetId, accountId }: AccountDetailsProps) => {
  const history = useHistory()
  const translate = useTranslate()

  // When the asset is ETH, we want to use the built-in default buy asset (FOX)
  const defaultBuyAssetId = useMemo(() => (assetId === ethAssetId ? undefined : assetId), [assetId])

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

  if (!accountId || !assetId) return null
  return (
    <Stack width='full' alignItems='flex-start' spacing={4} mx='auto' direction={directionXlRow}>
      <Stack spacing={4} flex='1 1 0%' width='full'>
        <AccountBalance
          assetId={assetId}
          accountId={accountId}
          backPath='/wallet/accounts'
          backLabel={translate('navBar.accounts')}
        />
        <Equity assetId={assetId} accountId={accountId} />
        {accountId && <AccountAssets assetId={assetId} accountId={accountId} />}
        <RelatedAssets assetId={assetId} />
        <AssetAccounts assetId={assetId} accountId={isUtxoAccountId(accountId) ? '' : accountId} />
        <EarnOpportunities assetId={assetId} accountId={accountId} />
        <AssetTransactionHistory limit={10} accountId={accountId} />
      </Stack>
      <Flex
        flexDir='column'
        flex='1 1 0%'
        width='full'
        maxWidth={flexMaxWidth}
        gap={4}
        display={displayMdBlock}
      >
        <MultiHopTrade
          isCompact
          defaultBuyAssetId={defaultBuyAssetId}
          onChangeTab={handleChangeTab}
        />
      </Flex>
    </Stack>
  )
}
