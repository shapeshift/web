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
import type {
  MidgardEarningsHistoryResponse,
  MidgardMember,
  MidgardMembersList,
} from 'lib/utils/thorchain/lp/types'
import { AsymSide } from 'lib/utils/thorchain/lp/types'
import { isUtxoChainId } from 'lib/utils/utxo'

const midgardUrl = getConfig().REACT_APP_MIDGARD_URL

const liquidityMember = (address: string) => ({
  queryKey: ['thorchainLiquidityMember', { address }] as [string, { address: string }],
  queryFn: async () => {
    try {
      const checksumAddress = isAddress(address) ? getAddress(address) : address
      const { data } = await axios.get<MidgardMember>(`${midgardUrl}/member/${checksumAddress}`)
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
  queryFn: async () => {
    const { data } = await axios.get<MidgardMembersList>(`${midgardUrl}/members`)
    return data
  },
})

export const thorchainLp = createQueryKeys('thorchainLp', {
  earnings: (from: string | undefined) => ({
    queryKey: ['thorchainearnings', from],
    queryFn: async () => {
      if (!from) return null
      const { data } = await axios.get<MidgardEarningsHistoryResponse>(
        `${midgardUrl}/history/earnings?from=${from}`,
      )
      return data
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
    // TODO(gomes): rename me to poolAssetId to make things clearer and less confusing, this isn't a bug.
    // since the AccountId may be for one asset but the (pool) AssetId for another
    assetId: AssetId
  }) => {
    return {
      queryKey: ['thorchainLiquidityProviderPosition', { accountId, assetId }],
      queryFn: async () => {
        const accountPosition = await (async () => {
          if (!isUtxoChainId(fromAssetId(assetId).chainId)) {
            const address = fromAccountId(accountId).account
            return queryClient.fetchQuery({ ...liquidityMember(address), staleTime: 0, gcTime: 0 })
          }

          const allMembers = await queryClient.fetchQuery({
            ...liquidityMembers(),
            staleTime: 0,
            gcTime: 0,
          })

          if (!allMembers.length) {
            throw new Error('No THORChain members found')
          }

          const accountAddresses = await getAccountAddresses(accountId)
          const foundMember = allMembers.find(member => accountAddresses.includes(member))

          if (!foundMember) return null

          return queryClient.fetchQuery({
            ...liquidityMember(foundMember),
            staleTime: 0,
            gcTime: 0,
          })
        })()

        if (!accountPosition) return null

        const positions = accountPosition.pools
          .filter(pool => pool.pool === assetIdToPoolAssetId({ assetId }))
          .map(position => ({ ...position, accountId }))

        return positions
      },
    }
  },
  userLpData: (assetId: AssetId, walletId: string | undefined) => ({
    queryKey: ['thorchainUserLpData', { assetId, walletId }],
  }),
})

// Not a query, but consuming one and living here to avoid circular deps
export const getThorchainLpPosition = async ({
  accountId,
  assetId: poolAssetId,
  opportunityId,
}: {
  accountId: AccountId
  assetId: AssetId
  opportunityId?: string
}) => {
  if (!opportunityId) throw new Error('opportunityId is required')

  const lpPositions = await queryClient.fetchQuery({
    ...thorchainLp.liquidityProviderPosition({ accountId, assetId: poolAssetId }),
    // @lukemorales/query-key-factory only returns queryFn and queryKey - all others will be ignored in the returned object
    // Since this isn't a query per se but rather a fetching util deriving from multiple queries, we want data to be considered stale immediately
    // Note however that the two underlying liquidityMember and liquidityMembers queries in this query *have* an Infinity staleTime themselves
    staleTime: 0,
  })

  if (!lpPositions) return null

  const position = lpPositions.find(_position => {
    const asymSide = (() => {
      if (_position.runeAddress === '') return AsymSide.Asset
      if (_position.assetAddress === '') return AsymSide.Rune
      return null
    })()
    const positionOpportunityId = `${poolAssetId}*${asymSide ?? 'sym'}`
    return positionOpportunityId === opportunityId
  })

  if (!position) return null

  return {
    runeAddress: position.runeAddress,
    assetAddress: position.assetAddress,
    opportunityId,
  }
}
