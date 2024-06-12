import { type AccountId, fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { type BigNumber, bnOrZero } from 'lib/bignumber/bignumber'
import type { PartialFields } from 'lib/types'
import {
  getThorchainSaversWithdrawQuote,
  getWithdrawBps,
} from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import { serializeUserStakingId, toOpportunityId } from 'state/slices/opportunitiesSlice/utils'
import { selectEarnUserStakingOpportunityByUserStakingId } from 'state/slices/selectors'
import { store } from 'state/store'

type FetchThorchainWithdrawQuoteInput = {
  asset: Asset
  accountId: AccountId
} & (
  | {
      amountCryptoBaseUnit: BigNumber.Value | null | undefined
      withdrawBps?: string
    }
  | {
      amountCryptoBaseUnit?: never
      withdrawBps: string
    }
)

export type GetThorchainSaversWithdrawQuoteQueryKey = [
  'thorchainSaversWithdrawQuote',
  PartialFields<FetchThorchainWithdrawQuoteInput, 'accountId'>,
]
export const fetchThorchainWithdrawQuote = async ({
  asset,
  accountId,
  amountCryptoBaseUnit,
  withdrawBps,
}: FetchThorchainWithdrawQuoteInput) => {
  const { chainId, assetNamespace, assetReference } = fromAssetId(asset.assetId)
  const opportunityId = toOpportunityId({ chainId, assetNamespace, assetReference })
  const opportunityData = selectEarnUserStakingOpportunityByUserStakingId(store.getState(), {
    userStakingId: serializeUserStakingId(accountId, opportunityId ?? ''),
  })

  const _withdrawBps =
    withdrawBps ||
    getWithdrawBps({
      withdrawAmountCryptoBaseUnit: amountCryptoBaseUnit ?? 0,
      stakedAmountCryptoBaseUnit: opportunityData?.stakedAmountCryptoBaseUnit ?? '0',
      rewardsAmountCryptoBaseUnit: opportunityData?.rewardsCryptoBaseUnit?.amounts[0] ?? '0',
    })

  const maybeQuote = await getThorchainSaversWithdrawQuote({
    asset,
    bps: _withdrawBps,
    accountId,
  })

  if (maybeQuote.isErr()) throw new Error(maybeQuote.unwrapErr())

  return maybeQuote.unwrap()
}

export const useGetThorchainSaversWithdrawQuoteQuery = ({
  asset,
  accountId,
  amountCryptoBaseUnit,
  enabled = true,
}: {
  asset: Asset
  accountId: AccountId | undefined
  amountCryptoBaseUnit: BigNumber.Value | null | undefined
  enabled?: boolean
}) => {
  const withdrawQuoteQueryKey: GetThorchainSaversWithdrawQuoteQueryKey = useMemo(
    () => ['thorchainSaversWithdrawQuote', { asset, accountId, amountCryptoBaseUnit }],
    [accountId, amountCryptoBaseUnit, asset],
  )

  const withdrawQuoteQuery = useQuery({
    queryKey: withdrawQuoteQueryKey,
    queryFn:
      enabled && accountId && bnOrZero(amountCryptoBaseUnit).gt(0)
        ? () => fetchThorchainWithdrawQuote({ asset, accountId, amountCryptoBaseUnit })
        : skipToken,
    staleTime: 5000,
  })

  return withdrawQuoteQuery
}
