import type { AccountId } from '@shapeshiftoss/caip'
import { createMigrate } from 'redux-persist'
import { describe, expect, it } from 'vitest'

import { clearPhantomDroppedChainAccounts } from './clearPhantomDroppedChainAccounts'
import { clearPortfolioMigrations } from './index'

import type { Portfolio, WalletId } from '@/state/slices/portfolioSlice/portfolioSliceCommon'
import { initialState } from '@/state/slices/portfolioSlice/portfolioSliceCommon'

const phantomWalletId = 'phantom:DsYwEVzeSNMkU5PVwjwtZ8EDRQxaR6paXfFAdhMQxmaV' as WalletId
const nativeWalletId = 'native:deadbeef' as WalletId

const ethAccountId: AccountId = 'eip155:1:0x73d0385f4d8e00c5e6504c6030f47bf6212736a8'
const monadAccountId: AccountId = 'eip155:143:0x73d0385f4d8e00c5e6504c6030f47bf6212736a8'
const btcAccountId: AccountId =
  'bip122:000000000019d6689c085ae165831e93:bc1q9sjm947kn2hz84syykmem7dshvevm8xm5dkrpg'
const suiAccountId: AccountId =
  'sui:35834a8a:0x4a5d095b3ddbf2776e9bb42c90e51ed96005ef9f4a5d095b3ddbf2776e9bb42c'
const solanaAccountId: AccountId =
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:DsYwEVzeSNMkU5PVwjwtZ8EDRQxaR6paXfFAdhMQxmaV'

const accountIds = [ethAccountId, monadAccountId, btcAccountId, suiAccountId, solanaAccountId]

const makeState = (walletById: Portfolio['wallet']['byId']): Portfolio => ({
  ...initialState,
  wallet: { byId: walletById, ids: Object.keys(walletById) as WalletId[] },
  enabledAccountIds: walletById,
  accounts: {
    byId: Object.fromEntries(accountIds.map(id => [id, { assetIds: [] }])),
    ids: accountIds,
  },
  accountMetadata: {
    byId: Object.fromEntries(
      accountIds.map(id => [id, { bip44Params: { purpose: 44, coinType: 60, accountNumber: 0 } }]),
    ),
    ids: accountIds,
  },
  accountBalances: {
    byId: Object.fromEntries(accountIds.map(id => [id, {}])),
    ids: accountIds,
  },
  // a fetch that never finished before the tab closed persists as true
  isPortfolioGetAccountLoadingByAccountId: Object.fromEntries(accountIds.map(id => [id, true])),
})

describe('clearPhantomDroppedChainAccounts', () => {
  it('drops bitcoin, sui and monad accounts from phantom wallets only', () => {
    const state = makeState({
      [phantomWalletId]: accountIds,
      [nativeWalletId]: [ethAccountId, btcAccountId],
    })

    const migrated = clearPhantomDroppedChainAccounts(state)

    expect(migrated.wallet.byId[phantomWalletId]).toEqual([ethAccountId, solanaAccountId])
    expect(migrated.enabledAccountIds[phantomWalletId]).toEqual([ethAccountId, solanaAccountId])
    expect(migrated.wallet.byId[nativeWalletId]).toEqual([ethAccountId, btcAccountId])

    // the bitcoin account is still held by the native wallet, the others are orphaned
    const remainingIds = [ethAccountId, btcAccountId, solanaAccountId]
    expect(migrated.accounts.ids).toEqual(remainingIds)
    expect(Object.keys(migrated.accounts.byId)).toEqual(remainingIds)
    expect(migrated.accountMetadata.ids).toEqual(remainingIds)
    expect(Object.keys(migrated.accountMetadata.byId)).toEqual(remainingIds)
    expect(migrated.accountBalances.ids).toEqual(remainingIds)
    expect(Object.keys(migrated.accountBalances.byId)).toEqual(remainingIds)
    expect(Object.keys(migrated.isPortfolioGetAccountLoadingByAccountId)).toEqual(remainingIds)
  })

  it('runs as the current portfolio persist migration', async () => {
    const state = makeState({ [phantomWalletId]: accountIds })
    const currentVersion = Math.max(...Object.keys(clearPortfolioMigrations).map(Number))
    const migrate = createMigrate(clearPortfolioMigrations, { debug: false })

    const migrated = (await migrate(
      { ...state, _persist: { version: 6, rehydrated: true } },
      currentVersion,
    )) as Portfolio

    expect(migrated.wallet.byId[phantomWalletId]).toEqual([ethAccountId, solanaAccountId])
    expect(migrated.accounts.ids).toEqual([ethAccountId, solanaAccountId])
  })

  it('returns the state untouched when no phantom wallet holds a dropped chain', () => {
    const state = makeState({
      [phantomWalletId]: [ethAccountId, solanaAccountId],
      [nativeWalletId]: accountIds,
    })

    expect(clearPhantomDroppedChainAccounts(state)).toBe(state)
  })
})
