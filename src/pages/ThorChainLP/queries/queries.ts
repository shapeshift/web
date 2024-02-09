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
import { get24hTvlChangePercentage, getAllTimeVolume, getEarnings } from 'lib/utils/thorchain/lp'
import {
  AsymSide,
  type MidgardLiquidityProvider,
  type MidgardLiquidityProvidersList,
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
  tvl24hChange: (assetId: AssetId | undefined) => ({
    queryKey: ['thorchainTvl24hChange', assetId],
    queryFn: () => {
      if (!assetId) throw new Error('assetId is required')
      return get24hTvlChangePercentage(assetId)
    },
    enabled: !!assetId,
  }),
  allTimeVolume: (assetId: AssetId | undefined, runePrice: string) => ({
    queryKey: ['thorchainAllTimeVolume', assetId],
    queryFn: () => {
      if (!assetId) throw new Error('assetId is required')
      return getAllTimeVolume(assetId, runePrice)
    },
    enabled: !!assetId && !!runePrice,
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
      // Since this isn't a query per se but rather a fetching util deriving from multiple queries, we want data to be considered stale immediately
      // Note however that the two underlying liquidityMember and liquidityMembers queries in this query *have* an Infinity staleTime themselves
      staleTime: 0,
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

  const lpPositions = await queryClient.fetchQuery(
    thorchainLp.liquidityProviderPosition({ accountId, assetId: poolAssetId }),
  )

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
