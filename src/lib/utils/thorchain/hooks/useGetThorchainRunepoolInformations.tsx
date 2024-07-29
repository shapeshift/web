import { skipToken, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { ThorchainRunepoolInformationsResponseSuccess } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/types'
import { getMaybeThorchainRunepoolInformations } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'

export type GetThorchainRunepoolInformationsQueryKey = ['thorchainRunepoolInformations']

export const fetchThorchainRunepoolInformations = async () => {
  const maybeThorchainInformations = await getMaybeThorchainRunepoolInformations()

  if (maybeThorchainInformations.isErr()) throw new Error(maybeThorchainInformations.unwrapErr())

  return maybeThorchainInformations.unwrap()
}

export const useGetThorchainRunepoolInformations = <
  SelectData = ThorchainRunepoolInformationsResponseSuccess,
>(
  {
    enabled,
    select,
  }: {
    enabled?: boolean
    select?: (stakingInfo: ThorchainRunepoolInformationsResponseSuccess) => SelectData
  } = { enabled: true },
) => {
  const runepoolInformationsQueryKey: GetThorchainRunepoolInformationsQueryKey = useMemo(
    () => ['thorchainRunepoolInformations'],
    [],
  )

  const runepoolInformationsQuery = useQuery({
    queryKey: runepoolInformationsQueryKey,
    queryFn: enabled ? () => fetchThorchainRunepoolInformations() : skipToken,
    staleTime: 5000,
    select,
    retry: false,
  })

  return runepoolInformationsQuery
}
