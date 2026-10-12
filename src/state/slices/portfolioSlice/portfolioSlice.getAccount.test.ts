import { ethAssetId, ethChainId, foxAssetId, toAccountId } from '@shapeshiftoss/caip'
import type { Account } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { describe, expect, it, vi } from 'vitest'

import { assets as assetsSlice } from '../assetsSlice/assetsSlice'
import { portfolioApi } from './portfolioSlice'

import { createStore } from '@/state/store'
import { ethPubKeys, mockEthAccount } from '@/test/mocks/accounts'
import { ethereum, fox } from '@/test/mocks/assets'

const mocks = vi.hoisted(() => {
  let resolveAccount: (account: unknown) => void = () => {}
  const account = new Promise(resolve => {
    resolveAccount = resolve
  })

  return { account, resolveAccount: (value: unknown) => resolveAccount(value) }
})

vi.mock('@/context/PluginProvider/chainAdapterSingleton', () => ({
  getChainAdapterManager: () =>
    new Map([
      [
        'eip155:1',
        {
          getFeeAssetId: () => 'eip155:1/slip44:60',
          getAccount: () => mocks.account,
        },
      ],
    ]),
}))

vi.mock('@/lib/portals/utils', async importOriginal => ({
  ...(await importOriginal<object>()),
  fetchPortalsAccount: () => Promise.resolve({}),
  fetchPortalsPlatforms: () => Promise.resolve({}),
}))

vi.mock('@/hooks/useIsSmartContractAddress/useIsSmartContractAddress', () => ({
  fetchIsSmartContractAddressQuery: () => Promise.resolve(false),
}))

describe('portfolioApi getAccount', () => {
  it('keeps assets the asset service loaded while the account was being fetched', async () => {
    const store = createStore()
    const accountId = toAccountId({ chainId: ethChainId, account: ethPubKeys[0] })

    // Persisted assets were cleared, so the account fetch starts from an empty asset state
    expect(store.getState().assets.byId[foxAssetId]).toBeUndefined()

    const getAccount = store.dispatch(
      portfolioApi.endpoints.getAccount.initiate({ accountId, upsertOnFetch: true }),
    )

    // The asset service lands while the account is still in flight
    store.dispatch(
      assetsSlice.actions.setGeneratedAssets({
        byId: { [ethAssetId]: ethereum, [foxAssetId]: fox },
        ids: [ethAssetId, foxAssetId],
        relatedAssetIndex: {},
        version: 'v1',
        watchedAssetIds: [],
        heldAssetIds: [],
      }),
    )

    const account: Account<KnownChainIds.EthereumMainnet> = mockEthAccount({
      chainSpecific: {
        nonce: 1,
        tokens: [
          { assetId: foxAssetId, balance: '1000', name: 'FOX', symbol: 'FOX', precision: 18 },
        ],
      },
    })
    mocks.resolveAccount(account)

    const { error } = await getAccount
    expect(error).toBeUndefined()

    expect(store.getState().assets.byId[foxAssetId]?.icon).toBe(fox.icon)
    expect(store.getState().portfolio.accountBalances.byId[accountId]?.[foxAssetId]).toBe('1000')
  })
})
