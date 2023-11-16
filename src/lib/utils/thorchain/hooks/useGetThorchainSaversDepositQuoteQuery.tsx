import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { Asset } from 'lib/asset-service'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { getMaybeThorchainSaversDepositQuote } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'

export type GetThorchainSaversDepositQuoteQueryKey = [
  'thorchainSaversDepositQuote',
  {
    asset: Asset
    amountCryptoBaseUnit: BigNumber.Value | null | undefined
  },
]
export const queryFn = async ({
  queryKey,
}: {
  queryKey: GetThorchainSaversDepositQuoteQueryKey
}) => {
  const [, { asset, amountCryptoBaseUnit }] = queryKey
  const maybeQuote = await getMaybeThorchainSaversDepositQuote({
    asset,
    amountCryptoBaseUnit,
  })

  if (maybeQuote.isErr()) throw new Error(maybeQuote.unwrapErr())

  return maybeQuote.unwrap()
}

// TODO(gomes): consume me everywhere instead of getMaybeThorchainSaversDepositQuote
export const useGetThorchainSaversDepositQuoteQuery = ({
  asset,
  amountCryptoBaseUnit,
}: {
  asset: Asset
  amountCryptoBaseUnit: BigNumber.Value | null | undefined
}) => {
  const depositQuoteQueryKey: GetThorchainSaversDepositQuoteQueryKey = useMemo(
    () => ['thorchainSaversDepositQuote', { asset, amountCryptoBaseUnit }],
    [amountCryptoBaseUnit, asset],
  )

  const depositQuoteQuery = useQuery({
    queryKey: depositQuoteQueryKey,
    queryFn,
    enabled: true,
    staleTime: 5000,
  })

  return depositQuoteQuery
}
