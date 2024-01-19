import { createQueryKeys } from '@lukemorales/query-key-factory'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import type { AxiosError } from 'axios'
import axios from 'axios'
import { getConfig } from 'config'
import { getAddress, isAddress } from 'viem'
import { queryClient } from 'context/QueryClientProvider/queryClient'
import { assetIdToPoolAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { getAccountAddresses } from 'lib/utils/thorchain'
import { getEarnings } from 'lib/utils/thorchain/lp'
import type {
  MidgardLiquidityProvider,
  MidgardLiquidityProvidersList,
} from 'lib/utils/thorchain/lp/types'
import { isUtxoChainId } from 'state/slices/portfolioSlice/utils'

const liquidityMember = (address: string) => ({
  queryKey: ['thorchainLiquidityMember', { address }] as [string, { address: string }],
  // Don't forget to invalidate me alongside thorchainUserLpData if you want to refresh the data
  staleTime: Infinity,
  queryFn: async () => {
    try {
      const checksumAddress = isAddress(address) ? getAddress(address) : address
      const { data } = await axios.get<MidgardLiquidityProvider>(
        `${getConfig().REACT_APP_MIDGARD_URL}/member/${checksumAddress}`,
      )

      return data
    } catch (e) {
      // THORCHain returns a 404 which is perfectly valid, but axios catches as an error
      // We only want to log errors to the console if they're actual errors, not 404s
      if ((e as AxiosError).isAxiosError && (e as AxiosError).response?.status !== 404)
        console.error(e)

      return null
    }
  },
})

export const liquidityMembers = () => ({
  queryKey: ['thorchainLiquidityMembers'] as [string],
  // Don't forget to invalidate me alongside thorchainUserLpData if you want to refresh the data
  staleTime: Infinity,
  queryFn: async () => {
    const { data } = await axios.get<MidgardLiquidityProvidersList>(
      `${getConfig().REACT_APP_MIDGARD_URL}/members`,
    )

    return data
  },
})

export const thorchainLp = createQueryKeys('thorchainLp', {
  earnings: (from: string | undefined) => ({
    enabled: Boolean(from),
    // We may or may not want to revisit this, but this will prevent overfetching for now
    staleTime: Infinity,
    queryKey: ['thorchainearnings', from],
    queryFn: () => {
      if (!from) throw new Error('from is required')
      return getEarnings({ from })
    },
  }),
  liquidityMembers,
  liquidityMember,
  // Technically not a query but derived data from multiple queries, but we make it one because of circular deps
  liquidityProviderPosition: ({
    accountId,
    assetId,
  }: {
    accountId: AccountId
    assetId: AssetId
  }) => ({
    enabled: !!accountId && !!assetId,
    queryKey: ['thorchainLiquidityProviderPosition', { accountId, assetId }],
    queryFn: async () => {
      const accountPosition = await (async () => {
        if (!isUtxoChainId(fromAssetId(assetId).chainId)) {
          const address = fromAccountId(accountId).account
          return queryClient.fetchQuery(liquidityMember(address))
        }

        const allMembers = await queryClient.fetchQuery(liquidityMembers())

        if (!allMembers.length) {
          throw new Error('No THORChain members found')
        }

        const accountAddresses = await getAccountAddresses(accountId)
        const foundMember = allMembers.find(member => accountAddresses.includes(member))
        if (!foundMember) return null

        return queryClient.fetchQuery(liquidityMember(foundMember))
      })()

      if (!accountPosition) return null

      const positions = accountPosition.pools
        .filter(pool => pool.pool === assetIdToPoolAssetId({ assetId }))
        .map(position => ({ ...position, accountId }))

      return positions
    },
  }),
})
