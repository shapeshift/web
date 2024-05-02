import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { AccountMetadata } from '@shapeshiftoss/types'
import { useQuery } from '@tanstack/react-query'
import { reactQueries } from 'react-queries'
import type { getThorchainLpPosition } from 'pages/ThorChainLP/queries/queries'
import type { getThorchainSaversPosition } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'

import type { getThorchainLendingPosition } from '../lending'

type UseThorchainFromAddressArgs = {
  accountId: AccountId
  assetId: AssetId
  opportunityId?: string | undefined
  wallet: HDWallet | undefined
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
      accountId,
      assetId,
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
