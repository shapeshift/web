import { Flex, Stack } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { ethAssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'

import { AccountAssets } from './AccountAssets/AccountAssets'
import { AssetAccounts } from './AssetAccounts/AssetAccounts'
import { AssetHeader } from './AssetHeader/AssetHeader'
import { Main } from './Layout/Main'
import { RelatedAssets } from './RelatedAssets/RelatedAssets'
import { EarnOpportunities } from './StakingVaults/EarnOpportunities'

import { AssetTransactionHistory } from '@/components/TransactionHistory/AssetTransactionHistory'
import { isUtxoAccountId } from '@/lib/utils/utxo'
import { StandaloneTrade } from '@/pages/Trade/StandaloneTrade'

type AccountDetailsProps = {
  assetId: AssetId
  accountId?: AccountId
}

const flexMaxWidth = { base: 'full', xl: 'md' }
const displayMdBlock = { base: 'none', md: 'flex' }

export const AccountDetails = ({ assetId, accountId }: AccountDetailsProps) => {
  // When the asset is ETH, we want to use the built-in default buy asset (FOX)
  const defaultBuyAssetId = useMemo(() => (assetId === ethAssetId ? undefined : assetId), [assetId])

  const assetHeader = useMemo(
    () => <AssetHeader assetId={assetId} accountId={accountId} />,
    [assetId, accountId],
  )

  if (!accountId || !assetId) return null
  return (
    <Main headerComponent={assetHeader} width='full' alignItems='flex-start' mx='auto' isSubPage>
      <Stack spacing={4} flex='1 1 0%' width='full'>
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
        <StandaloneTrade isCompact defaultBuyAssetId={defaultBuyAssetId} />
      </Flex>
    </Main>
  )
}
