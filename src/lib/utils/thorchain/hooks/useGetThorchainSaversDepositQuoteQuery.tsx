import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { Asset } from 'lib/asset-service'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { getMaybeThorchainSaversDepositQuote } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'

export const useGetThorchainSaversDepositQuoteQuery = ({
  asset,
  amountCryptoBaseUnit,
}: {
  asset: Asset
  amountCryptoBaseUnit: BigNumber.Value | null | undefined
}) => {
  const depositQuoteQueryKey = useMemo(
    () => ['thorchainLendingPoolData', { asset, amountCryptoBaseUnit }] as const,
    [amountCryptoBaseUnit, asset],
  )

  const depositQuoteQuery = useQuery({
    queryKey: depositQuoteQueryKey,
    queryFn: async ({ queryKey }) => {
      const [, { asset, amountCryptoBaseUnit }] = queryKey
      const maybeQuote = await getMaybeThorchainSaversDepositQuote({
        asset,
        amountCryptoBaseUnit,
      })

      if (maybeQuote.isErr()) throw new Error(maybeQuote.unwrapErr())

      return maybeQuote.unwrap()
    },
    enabled: true,
  })

  return depositQuoteQuery
}
