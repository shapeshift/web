import { useGetLimitOrdersQuery } from '@/state/apis/limit-orders/limitOrderApi'
import { selectEvmAccountIds } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export const useLimitOrders = () => {
  const evmAccountIds = useAppSelector(selectEvmAccountIds)

  const limitOrdersQuery = useGetLimitOrdersQuery(evmAccountIds, {
    pollingInterval: 15_000,
    refetchOnMountOrArgChange: false,
    skip: !evmAccountIds.length,
  })

  console.log({ limitOrdersQuery })

  return limitOrdersQuery
}
