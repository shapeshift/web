import { useQuery } from '@tanstack/react-query'
import { reactQueries } from 'react-queries'

export const useAllowance = ({
  assetId,
  spender,
  from,
}: {
  assetId: string | undefined
  spender: string | undefined
  from: string | undefined
}) => {
  const query = useQuery({
    ...reactQueries.common.allowanceCryptoBaseUnit(assetId, spender, from),
    refetchInterval: 15_000,
    enabled: Boolean(assetId && spender && from),
  })

  return query
}
