import { useQuery } from '@tanstack/react-query'
import { reactQueries } from 'react-queries'

import { selectAllowanceCryptoBaseUnit } from './selectors'

type UseAllowanceArgs = {
  assetId: string | undefined
  spender: string | undefined
  from: string | undefined
  isDisabled?: boolean
}

export const useAllowance = ({ assetId, spender, from, isDisabled }: UseAllowanceArgs) => {
  const query = useQuery({
    ...reactQueries.common.allowanceCryptoBaseUnit(assetId, spender, from),
    refetchOnMount: 'always',
    refetchInterval: 15_000,
    enabled: Boolean(!isDisabled && assetId && spender && from),
    select: selectAllowanceCryptoBaseUnit,
  })

  return query
}
