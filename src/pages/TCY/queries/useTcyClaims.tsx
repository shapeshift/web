import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, fromAssetId, thorchainChainId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { MetaMaskMultiChainHDWallet } from '@shapeshiftoss/hdwallet-metamask-multichain'
import { isRune, thorPoolAssetIdToAssetId } from '@shapeshiftoss/swapper'
import { isUtxoChainId } from '@shapeshiftoss/utils'
import { useSuspenseQueries, useSuspenseQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useMemo } from 'react'

import type { Claim, TcyClaimer } from '../components/Claim/types'

import { getConfig } from '@/config'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useIsSnapInstalled } from '@/hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { fetchTcyClaimsGraphQL } from '@/lib/graphql/tcyClaimsData'
import { isSome } from '@/lib/utils'
import { getThorfiUtxoFromAddresses } from '@/lib/utils/thorchain'
import { isSupportedThorchainSaversAssetId } from '@/state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import {
  selectAccountIdsByAccountNumberAndChainId,
  selectAccountNumberByAccountId,
  selectEnabledWalletAccountIds,
  selectPortfolioAccountMetadataByAccountId,
} from '@/state/slices/selectors'
import { store, useAppSelector } from '@/state/store'

type AddressInfo = {
  address: string
  accountId: AccountId
}

async function getActiveAddressesForAccount(
  accountId: AccountId,
  wallet: HDWallet | null,
  isSnapInstalled: boolean | null,
): Promise<AddressInfo[]> {
  const chainId = fromAccountId(accountId).chainId
  const assetId = getChainAdapterManager().get(chainId)?.getFeeAssetId()
  if (!assetId) return []
  if (!isSupportedThorchainSaversAssetId(assetId)) return []
  if (isRune(assetId)) return []

  if (!isUtxoChainId(fromAccountId(accountId).chainId)) {
    return [{ address: fromAccountId(accountId).account, accountId }]
  }

  const isMetaMaskMultichainWallet = wallet instanceof MetaMaskMultiChainHDWallet

  if (isMetaMaskMultichainWallet && !isSnapInstalled) return []

  const accountMetadata = selectPortfolioAccountMetadataByAccountId(store.getState(), {
    accountId,
  })
  if (!accountMetadata) return []
  if (!wallet) return []

  const addresses = await getThorfiUtxoFromAddresses({
    accountId,
    assetId,
    accountMetadata,
    wallet,
  })

  return addresses.filter(isSome).map(address => ({ address, accountId }))
}

function mapClaimerToClaim(
  claimer: TcyClaimer,
  accountId: AccountId,
  accountIdsByAccountNumberAndChainId: ReturnType<typeof selectAccountIdsByAccountNumberAndChainId>,
): Claim | null {
  const assetId = thorPoolAssetIdToAssetId(claimer.asset)
  if (!assetId) return null

  const chainId = fromAssetId(assetId).chainId
  if (chainId !== fromAccountId(accountId).chainId) return null

  const l1AccountNumber = selectAccountNumberByAccountId(store.getState(), { accountId })
  const matchingRuneAccountId =
    l1AccountNumber !== undefined
      ? accountIdsByAccountNumberAndChainId[l1AccountNumber]?.[thorchainChainId]?.[0]
      : undefined

  return {
    ...claimer,
    accountId,
    amountThorBaseUnit: claimer.amount,
    assetId,
    matchingRuneAccountId,
    l1_address:
      claimer.asset === 'BCH.BCH' ? `bitcoincash:${claimer.l1_address}` : claimer.l1_address,
  }
}

const useTCYClaimsGraphQL = (accountNumber: number | 'all') => {
  const {
    state: { isConnected, wallet, isLocked },
  } = useWallet()
  const { isSnapInstalled } = useIsSnapInstalled()

  const accountIdsByAccountNumberAndChainId = useAppSelector(
    selectAccountIdsByAccountNumberAndChainId,
  )

  const allAccountIds = useAppSelector(selectEnabledWalletAccountIds)
  const accountIds = useMemo(
    () =>
      accountNumber === 'all'
        ? allAccountIds
        : Object.values(accountIdsByAccountNumberAndChainId[accountNumber] || {})
            .flat()
            .filter(isSome),
    [accountNumber, allAccountIds, accountIdsByAccountNumberAndChainId],
  )

  return useSuspenseQuery({
    queryKey: ['tcy-claims-graphql', accountIds.join(','), isConnected, isLocked, isSnapInstalled],
    queryFn: async (): Promise<{ data: Claim[] }[]> => {
      if (!isConnected) return accountIds.map(() => ({ data: [] }))

      const allAddressInfos = await Promise.all(
        accountIds.map(accountId =>
          getActiveAddressesForAccount(accountId, wallet, isSnapInstalled),
        ),
      )

      const flatAddressInfos = allAddressInfos.flat()
      if (flatAddressInfos.length === 0) {
        return accountIds.map(() => ({ data: [] }))
      }

      const addressToAccountId = new Map<string, AccountId>()
      for (const info of flatAddressInfos) {
        addressToAccountId.set(info.address.toLowerCase(), info.accountId)
      }

      const addresses = Array.from(addressToAccountId.keys())

      try {
        const graphqlClaims = await fetchTcyClaimsGraphQL(addresses)

        const claimsByAccountId = new Map<AccountId, Claim[]>()
        for (const accountId of accountIds) {
          claimsByAccountId.set(accountId, [])
        }

        for (const gqlClaim of graphqlClaims) {
          const accountId = addressToAccountId.get(gqlClaim.l1Address.toLowerCase())
          if (!accountId) continue

          const claimer: TcyClaimer = {
            asset: gqlClaim.asset,
            amount: gqlClaim.amount,
            l1_address: gqlClaim.l1Address,
          }

          const claim = mapClaimerToClaim(claimer, accountId, accountIdsByAccountNumberAndChainId)
          if (claim) {
            const existing = claimsByAccountId.get(accountId) ?? []
            existing.push(claim)
            claimsByAccountId.set(accountId, existing)
          }
        }

        return accountIds.map(accountId => ({
          data: claimsByAccountId.get(accountId) ?? [],
        }))
      } catch (error) {
        console.error('[useTCYClaimsGraphQL] Failed to fetch claims:', error)
        return accountIds.map(() => ({ data: [] }))
      }
    },
    staleTime: 60_000,
  })
}

const useTCYClaimsLegacy = (accountNumber: number | 'all') => {
  const {
    state: { isConnected, wallet, isLocked },
  } = useWallet()
  const { isSnapInstalled } = useIsSnapInstalled()

  const accountIdsByAccountNumberAndChainId = useAppSelector(
    selectAccountIdsByAccountNumberAndChainId,
  )

  const allAccountIds = useAppSelector(selectEnabledWalletAccountIds)
  const accountIds = useMemo(
    () =>
      accountNumber === 'all'
        ? allAccountIds
        : Object.values(accountIdsByAccountNumberAndChainId[accountNumber] || {})
            .flat()
            .filter(isSome),
    [accountNumber, allAccountIds, accountIdsByAccountNumberAndChainId],
  )

  return useSuspenseQueries({
    queries: accountIds.map(accountId => ({
      queryKey: ['tcy-claims', accountId, isConnected, isLocked, isSnapInstalled],
      queryFn: async (): Promise<Claim[]> => {
        if (!isConnected) return []

        const activeAddresses = (
          await ((): Promise<string[]> => {
            const chainId = fromAccountId(accountId).chainId
            const assetId = getChainAdapterManager().get(chainId)?.getFeeAssetId()
            if (!assetId) return Promise.resolve([])
            if (!isSupportedThorchainSaversAssetId(assetId)) return Promise.resolve([])
            if (isRune(assetId)) return Promise.resolve([])

            if (!isUtxoChainId(fromAccountId(accountId).chainId))
              return Promise.resolve([fromAccountId(accountId).account])

            const isMetaMaskMultichainWallet = wallet instanceof MetaMaskMultiChainHDWallet

            if (isMetaMaskMultichainWallet && !isSnapInstalled) return Promise.resolve([])

            const accountMetadata = selectPortfolioAccountMetadataByAccountId(store.getState(), {
              accountId,
            })
            if (!accountMetadata) return Promise.resolve([])
            if (!wallet) return Promise.resolve([])

            return getThorfiUtxoFromAddresses({
              accountId,
              assetId,
              accountMetadata,
              wallet,
            })
          })()
        ).filter(isSome)

        if (!activeAddresses) return []

        try {
          const tcyClaimers = await Promise.all(
            activeAddresses.map(address =>
              axios.get<{ tcy_claimer: TcyClaimer[] }>(
                `${getConfig().VITE_THORCHAIN_NODE_URL}/thorchain/tcy_claimer/${address}`,
              ),
            ),
          )

          return tcyClaimers
            .map(response => response.data.tcy_claimer)
            .flat()
            .filter(claimer => {
              const assetId = thorPoolAssetIdToAssetId(claimer.asset)
              if (!assetId) return false

              const chainId = fromAssetId(assetId).chainId

              if (chainId !== fromAccountId(accountId).chainId) return false

              return true
            })
            .map(claimer => {
              const l1AccountNumber = selectAccountNumberByAccountId(store.getState(), {
                accountId,
              })
              const matchingRuneAccountId =
                l1AccountNumber !== undefined
                  ? accountIdsByAccountNumberAndChainId[l1AccountNumber]?.[thorchainChainId]?.[0]
                  : undefined

              return {
                ...claimer,
                accountId,
                amountThorBaseUnit: claimer.amount,
                assetId: thorPoolAssetIdToAssetId(claimer.asset) ?? '',
                matchingRuneAccountId,
                l1_address:
                  claimer.asset === 'BCH.BCH'
                    ? `bitcoincash:${claimer.l1_address}`
                    : claimer.l1_address,
              }
            })
        } catch {
          return []
        }
      },
      staleTime: 60_000,
    })),
  })
}

export const useTCYClaims = (accountNumber: number | 'all') => {
  const isGraphQLEnabled = useFeatureFlag('GraphQLTcyClaims')

  const graphqlResult = useTCYClaimsGraphQL(accountNumber)
  const legacyResult = useTCYClaimsLegacy(accountNumber)

  if (isGraphQLEnabled) {
    return graphqlResult.data
  }

  return legacyResult
}
