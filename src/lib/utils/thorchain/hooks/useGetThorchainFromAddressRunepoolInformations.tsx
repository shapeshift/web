import type { AccountId } from '@shapeshiftoss/caip'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { ThorchainFromAddressRunepoolInformationsResponseSuccess } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/types'
import { getMaybeThorchainFromAddressRunepoolInformations } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'

type FetchThorchainFromAddressRunepoolInput = {
  accountId: AccountId
}

export type GetThorchainFromAddressRunepoolInformationsQueryKey = [
  'thorchainFromAddressRunepool',
  { accountId: AccountId | undefined },
]
export const fetchThorchainFromAddressRunepoolInformations = async ({
  accountId,
}: FetchThorchainFromAddressRunepoolInput) => {
  const maybeRunepoolInformations = await getMaybeThorchainFromAddressRunepoolInformations({
    accountId,
  })

  if (maybeRunepoolInformations.isErr()) throw new Error(maybeRunepoolInformations.unwrapErr())

  return maybeRunepoolInformations.unwrap()
}

export const useGetThorchainFromAddressRunepoolInformations = <
  SelectData = ThorchainFromAddressRunepoolInformationsResponseSuccess,
>({
  accountId,
  enabled = true,
  select,
}: {
  accountId: AccountId | undefined
  enabled?: boolean
  select?: (stakingInfo: ThorchainFromAddressRunepoolInformationsResponseSuccess) => SelectData
}) => {
  const fromAddressRunepoolInformationsQueryKey: GetThorchainFromAddressRunepoolInformationsQueryKey =
    useMemo(() => ['thorchainFromAddressRunepool', { accountId }], [accountId])

  const fromAddressRunepoolQuoteQuery = useQuery({
    queryKey: fromAddressRunepoolInformationsQueryKey,
    queryFn:
      enabled && accountId
        ? () => fetchThorchainFromAddressRunepoolInformations({ accountId })
        : skipToken,
    staleTime: 5000,
    select,
    retry: false,
  })

  return fromAddressRunepoolQuoteQuery
}
