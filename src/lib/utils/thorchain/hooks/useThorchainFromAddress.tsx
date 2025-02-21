import type { AccountId, AssetId } from '@shapeshiftmonorepo/caip'
import type { AccountMetadata } from '@shapeshiftmonorepo/types'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { useQuery } from '@tanstack/react-query'
import { reactQueries } from 'react-queries'

import type { getThorchainLendingPosition } from '../lending'

import type { getThorchainLpPosition } from '@/pages/ThorChainLP/queries/queries'
import type { getThorchainSaversPosition } from '@/state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'

type UseThorchainFromAddressArgs = {
  accountId: AccountId | undefined
  assetId: AssetId | undefined
  opportunityId: string | undefined
  wallet: HDWallet | null
  accountMetadata: AccountMetadata | undefined
  getPosition:
    | typeof getThorchainLendingPosition
    | typeof getThorchainSaversPosition
    | typeof getThorchainLpPosition
  select?: (maybeAddress: string) => string | undefined
  enabled?: boolean
}

export const useThorchainFromAddress = ({
  wallet,
  accountId,
  assetId,
  opportunityId,
  accountMetadata,
  getPosition,
  select,
  enabled = true,
}: UseThorchainFromAddressArgs) => {
  const query = useQuery({
    ...reactQueries.common.thorchainFromAddress({
      accountId: accountId!,
      assetId: assetId!,
      opportunityId,
      wallet: wallet!,
      accountMetadata: accountMetadata!,
      getPosition,
    }),
    staleTime: 0,
    gcTime: 0,
    select,
    enabled: Boolean(enabled && wallet && accountId && accountMetadata && assetId),
  })

  return query
}
