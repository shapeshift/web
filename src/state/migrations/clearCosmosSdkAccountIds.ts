import {
  cosmosChainId,
  fromAccountId,
  mayachainChainId,
  thorchainChainId,
} from '@shapeshiftoss/caip'
import type { PersistPartial } from 'redux-persist/es/persistReducer'

import type { Portfolio } from '@/state/slices/portfolioSlice/portfolioSliceCommon'

// Cosmos SDK chains that need to be cleared due to GridPlus derivation path fix
const COSMOS_SDK_CHAIN_IDS = [
  cosmosChainId,
  thorchainChainId,
  mayachainChainId,
]

/**
 * Migration to clear AccountIds for Cosmos SDK chains due to GridPlus derivation path fix.
 * GridPlus was incorrectly deriving from 4-level paths instead of 5-level BIP44 paths,
 * causing wrong addresses for ATOM, THOR, MAYA, OSMO, and ARKEO chains.
 * This clears only those specific AccountIds so they'll be re-derived correctly.
 */
export const clearCosmosSdkAccountIds = (state: Portfolio): Portfolio & PersistPartial => {
  // Filter out Cosmos SDK AccountIds from accounts
  const filteredAccountIds = state.accounts.ids.filter(accountId => {
    const { chainId } = fromAccountId(accountId)
    return !COSMOS_SDK_CHAIN_IDS.includes(chainId)
  })

  const filteredAccountsById: typeof state.accounts.byId = {}
  filteredAccountIds.forEach(accountId => {
    filteredAccountsById[accountId] = state.accounts.byId[accountId]
  })

  // Filter out Cosmos SDK AccountIds from accountMetadata
  const filteredMetadataIds = state.accountMetadata.ids.filter(accountId => {
    const { chainId } = fromAccountId(accountId)
    return !COSMOS_SDK_CHAIN_IDS.includes(chainId)
  })

  const filteredMetadataById: typeof state.accountMetadata.byId = {}
  filteredMetadataIds.forEach(accountId => {
    filteredMetadataById[accountId] = state.accountMetadata.byId[accountId]
  })

  // Filter out Cosmos SDK AccountIds from accountBalances
  const filteredBalanceIds = state.accountBalances.ids.filter(accountId => {
    const { chainId } = fromAccountId(accountId)
    return !COSMOS_SDK_CHAIN_IDS.includes(chainId)
  })

  const filteredBalancesById: typeof state.accountBalances.byId = {}
  filteredBalanceIds.forEach(accountId => {
    filteredBalancesById[accountId] = state.accountBalances.byId[accountId]
  })

  // Filter out Cosmos SDK AccountIds from enabledAccountIds
  const filteredEnabledAccountIds: typeof state.enabledAccountIds = {}
  Object.entries(state.enabledAccountIds).forEach(([walletId, accountIds]) => {
    if (!accountIds) return
    filteredEnabledAccountIds[walletId] = accountIds.filter(accountId => {
      const { chainId } = fromAccountId(accountId)
      return !COSMOS_SDK_CHAIN_IDS.includes(chainId)
    })
  })

  // Filter out Cosmos SDK AccountIds from wallet.byId
  const filteredWalletById: typeof state.wallet.byId = {}
  Object.entries(state.wallet.byId).forEach(([walletId, accountIds]) => {
    filteredWalletById[walletId] = accountIds.filter(accountId => {
      const { chainId } = fromAccountId(accountId)
      return !COSMOS_SDK_CHAIN_IDS.includes(chainId)
    })
  })

  return {
    ...state,
    accounts: {
      byId: filteredAccountsById,
      ids: filteredAccountIds,
    },
    accountMetadata: {
      byId: filteredMetadataById,
      ids: filteredMetadataIds,
    },
    accountBalances: {
      byId: filteredBalancesById,
      ids: filteredBalanceIds,
    },
    enabledAccountIds: filteredEnabledAccountIds,
    wallet: {
      ...state.wallet,
      byId: filteredWalletById,
    },
  } as Portfolio & PersistPartial
}
