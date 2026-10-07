import type { AccountId } from '@shapeshiftoss/caip'
import { btcChainId, monadChainId, suiChainId } from '@shapeshiftoss/caip'
import omit from 'lodash/omit'
import type { PersistPartial } from 'redux-persist/es/persistReducer'

import type { Portfolio, WalletId } from '@/state/slices/portfolioSlice/portfolioSliceCommon'

// Phantom dropped its Bitcoin, Sui and Monad dApp support, so accounts discovered through it before then can no longer be read or signed for
const droppedChainIds = [btcChainId, suiChainId, monadChainId]

const isPhantomWalletId = (walletId: string) => walletId.startsWith('phantom:')

// A prefix test rather than fromAccountId, a throw here would make redux-persist discard the whole portfolio cache
const isDroppedAccountId = (accountId: AccountId) =>
  droppedChainIds.some(chainId => accountId.startsWith(`${chainId}:`))

export const clearPhantomDroppedChainAccounts = (state: Portfolio): Portfolio & PersistPartial => {
  const walletById = { ...state.wallet.byId }
  const enabledAccountIds = { ...state.enabledAccountIds }
  const droppedAccountIds = new Set<AccountId>()

  for (const walletId of Object.keys(walletById) as WalletId[]) {
    if (!isPhantomWalletId(walletId)) continue

    const accountIds = walletById[walletId] ?? []
    const dropped = accountIds.filter(isDroppedAccountId)
    if (!dropped.length) continue

    dropped.forEach(accountId => droppedAccountIds.add(accountId))
    walletById[walletId] = accountIds.filter(accountId => !droppedAccountIds.has(accountId))
    const enabled = enabledAccountIds[walletId]
    if (enabled) {
      enabledAccountIds[walletId] = enabled.filter(accountId => !droppedAccountIds.has(accountId))
    }
  }

  if (!droppedAccountIds.size) return state as Portfolio & PersistPartial

  const referencedAccountIds = new Set(Object.values(walletById).flat())
  const orphanedAccountIds = [...droppedAccountIds].filter(
    accountId => !referencedAccountIds.has(accountId),
  )
  const isOrphaned = (accountId: AccountId) => orphanedAccountIds.includes(accountId)

  return {
    ...state,
    wallet: { ...state.wallet, byId: walletById },
    enabledAccountIds,
    accounts: {
      byId: omit(state.accounts.byId, orphanedAccountIds),
      ids: state.accounts.ids.filter(accountId => !isOrphaned(accountId)),
    },
    accountMetadata: {
      byId: omit(state.accountMetadata.byId, orphanedAccountIds),
      ids: state.accountMetadata.ids.filter(accountId => !isOrphaned(accountId)),
    },
    accountBalances: {
      byId: omit(state.accountBalances.byId, orphanedAccountIds),
      ids: state.accountBalances.ids.filter(accountId => !isOrphaned(accountId)),
    },
    isPortfolioGetAccountLoadingByAccountId: omit(
      state.isPortfolioGetAccountLoadingByAccountId,
      orphanedAccountIds,
    ),
  } as Portfolio & PersistPartial
}
