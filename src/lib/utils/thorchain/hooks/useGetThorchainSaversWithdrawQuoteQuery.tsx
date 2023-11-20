import { type AccountId, fromAssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { Asset } from 'lib/asset-service'
import type { BigNumber } from 'lib/bignumber/bignumber'
import {
  getThorchainSaversWithdrawQuote,
  getWithdrawBps,
} from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import { serializeUserStakingId, toOpportunityId } from 'state/slices/opportunitiesSlice/utils'
import { selectEarnUserStakingOpportunityByUserStakingId } from 'state/slices/selectors'
import { store } from 'state/store'

export type GetThorchainSaversWithdrawQuoteQueryKey = [
  'thorchainSaversWithdrawQuote',
  {
    asset: Asset
    accountId: AccountId | undefined
    amountCryptoBaseUnit: BigNumber.Value | null | undefined
  },
]
export const queryFn = async ({
  queryKey,
}: {
  queryKey: GetThorchainSaversWithdrawQuoteQueryKey
}) => {
  const [, { asset, accountId, amountCryptoBaseUnit }] = queryKey
  if (!accountId) return

  const { chainId, assetNamespace, assetReference } = fromAssetId(asset.assetId)
  const opportunityId = toOpportunityId({ chainId, assetNamespace, assetReference })
  const opportunityData = selectEarnUserStakingOpportunityByUserStakingId(store.getState(), {
    userStakingId: serializeUserStakingId(accountId, opportunityId ?? ''),
  })

  const withdrawBps = getWithdrawBps({
    withdrawAmountCryptoBaseUnit: amountCryptoBaseUnit ?? 0,
    stakedAmountCryptoBaseUnit: opportunityData?.stakedAmountCryptoBaseUnit ?? '0',
    rewardsAmountCryptoBaseUnit: opportunityData?.rewardsCryptoBaseUnit?.amounts[0] ?? '0',
  })

  const maybeQuote = await getThorchainSaversWithdrawQuote({
    asset,
    bps: withdrawBps,
    accountId,
  })

  if (maybeQuote.isErr()) throw new Error(maybeQuote.unwrapErr())

  return maybeQuote.unwrap()
}

// TODO(gomes): consume me everywhere instead of getThorchainSaversWithdrawQuote
export const useGetThorchainSaversWithdrawQuoteQuery = ({
  asset,
  accountId,
  amountCryptoBaseUnit,
}: {
  asset: Asset
  accountId: AccountId | undefined
  amountCryptoBaseUnit: BigNumber.Value | null | undefined
}) => {
  const withdrawQuoteQueryKey: GetThorchainSaversWithdrawQuoteQueryKey = useMemo(
    () => ['thorchainSaversWithdrawQuote', { asset, accountId, amountCryptoBaseUnit }],
    [accountId, amountCryptoBaseUnit, asset],
  )

  const withdrawQuoteQuery = useQuery({
    queryKey: withdrawQuoteQueryKey,
    queryFn,
    enabled: Boolean(accountId),
    staleTime: 5000,
  })

  return withdrawQuoteQuery
}
