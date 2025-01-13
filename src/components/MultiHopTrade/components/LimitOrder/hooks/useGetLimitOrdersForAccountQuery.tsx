import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { assertGetCowNetwork, getCowNetwork } from '@shapeshiftoss/swapper'
import type { Order } from '@shapeshiftoss/types'
import { isSome } from '@shapeshiftoss/utils'
import { useQueries } from '@tanstack/react-query'
import axios from 'axios'
import { getConfig } from 'config'
import orderBy from 'lodash/orderBy'
import { useCallback } from 'react'
import { mergeQueryOutputs } from 'react-queries/helpers'
import { selectEvmAccountIds } from 'state/slices/common-selectors'
import { useAppSelector } from 'state/store'

type CustomTokenQueryKey = ['getLimitOrdersForAccount', AccountId]

const getLimitOrdersForAccountQueryKey = (accountId: AccountId): CustomTokenQueryKey => [
  'getLimitOrdersForAccount',
  accountId,
]

export const useGetLimitOrdersQuery = () => {
  const evmAccountIds = useAppSelector(selectEvmAccountIds)

  const getQueryFn = useCallback(
    (accountId: AccountId) => async () => {
      const { account, chainId } = fromAccountId(accountId)
      const network = assertGetCowNetwork(chainId)
      const config = getConfig()
      const baseUrl = config.REACT_APP_COWSWAP_BASE_URL
      const result = await axios.get<Order[]>(
        // TODO: Implement paging for users with >1000 orders
        `${baseUrl}/${network}/api/v1/account/${account}/orders?limit=1000`,
      )

      return result.data.map(order => {
        return { order, accountId }
      })
    },
    [],
  )

  const customTokenQueries = useQueries({
    queries: evmAccountIds
      .filter(accountId => {
        const { chainId } = fromAccountId(accountId)
        return Boolean(getCowNetwork(chainId))
      })
      .map(accountId => ({
        queryKey: getLimitOrdersForAccountQueryKey(accountId),
        queryFn: getQueryFn(accountId),
        refetchInterval: 15_000,
      })),
    combine: queries =>
      mergeQueryOutputs(queries, results =>
        orderBy(results.flat().filter(isSome), ({ order }) => order.creationDate, 'desc'),
      ),
  })

  return customTokenQueries
}
