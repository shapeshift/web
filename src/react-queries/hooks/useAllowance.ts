import { useQuery } from '@tanstack/react-query'
import { reactQueries } from 'react-queries'

import { selectAllowanceCryptoBaseUnit } from './selectors'

type UseAllowanceArgs = {
  assetId: string | undefined
  spender: string | undefined
  pubKey: string | undefined
}

export const useAllowance = ({ assetId, spender, pubKey }: UseAllowanceArgs) => {
  const query = useQuery({
    ...reactQueries.common.allowanceCryptoBaseUnit(assetId, spender, pubKey),
    refetchOnMount: 'always',
    refetchInterval: 15_000,
    enabled: Boolean(assetId && spender && pubKey),
    select: selectAllowanceCryptoBaseUnit,
  })

  return query
}
