import type { Asset } from '@shapeshiftoss/types'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { PartialFields } from 'lib/types'
import type { ThorchainSaversDepositQuoteResponseSuccess } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/types'
import { getMaybeThorchainSaversDepositQuote } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'

type FetchThorchainDepositQuoteInput = {
  asset: Asset
  amountCryptoBaseUnit: BigNumber.Value | null | undefined
}

export type GetThorchainSaversDepositQuoteQueryKey = [
  'thorchainSaversDepositQuote',
  PartialFields<FetchThorchainDepositQuoteInput, 'asset'>,
]
export const fetchThorchainDepositQuote = async ({
  asset,
  amountCryptoBaseUnit,
}: FetchThorchainDepositQuoteInput) => {
  const maybeQuote = await getMaybeThorchainSaversDepositQuote({
    asset,
    amountCryptoBaseUnit,
  })

  if (maybeQuote.isErr()) throw new Error(maybeQuote.unwrapErr())

  return maybeQuote.unwrap()
}

export const useGetThorchainSaversDepositQuoteQuery = <
  SelectData = ThorchainSaversDepositQuoteResponseSuccess,
>({
  asset,
  amountCryptoBaseUnit,
  enabled = true,
  select,
}: {
  asset: Asset | undefined
  amountCryptoBaseUnit: BigNumber.Value | null | undefined
  enabled?: boolean
  select?: (stakingInfo: ThorchainSaversDepositQuoteResponseSuccess) => SelectData
}) => {
  const depositQuoteQueryKey: GetThorchainSaversDepositQuoteQueryKey = useMemo(
    () => ['thorchainSaversDepositQuote', { asset, amountCryptoBaseUnit }],
    [amountCryptoBaseUnit, asset],
  )

  const depositQuoteQuery = useQuery({
    queryKey: depositQuoteQueryKey,
    queryFn:
      enabled && asset && Boolean(bnOrZero(amountCryptoBaseUnit).gt(0))
        ? () => fetchThorchainDepositQuote({ asset, amountCryptoBaseUnit })
        : skipToken,
    staleTime: 5000,
    select,
    retry: false,
  })

  return depositQuoteQuery
}
