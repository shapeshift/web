import { useQuery } from '@tanstack/react-query'

import { selectAllowanceCryptoBaseUnit } from './selectors'

import { bn } from '@/lib/bignumber/bignumber'
import { reactQueries } from '@/react-queries'

const REFETCH_INTERVAL_MS = 15_000

type UseAllowanceArgs = {
  assetId: string | undefined
  spender: string | undefined
  from: string | undefined
  amountCryptoBaseUnit?: string
  isDisabled?: boolean
  isRefetchEnabled: boolean
}

export const useAllowance = ({
  assetId,
  spender,
  from,
  amountCryptoBaseUnit,
  isDisabled,
  isRefetchEnabled,
}: UseAllowanceArgs) => {
  const query = useQuery({
    ...reactQueries.common.allowanceCryptoBaseUnit(assetId, spender, from),
    refetchOnMount: 'always',
    refetchInterval: query => {
      if (!isRefetchEnabled) return false
      if (!amountCryptoBaseUnit) return REFETCH_INTERVAL_MS

      const data = query.state.data
      if (!data) return REFETCH_INTERVAL_MS
      if (data.isErr()) return false

      return bn(data.unwrap()).lt(amountCryptoBaseUnit) ? REFETCH_INTERVAL_MS : false
    },
    enabled: Boolean(!isDisabled && assetId && spender && from),
    select: selectAllowanceCryptoBaseUnit,
  })

  return query
}
