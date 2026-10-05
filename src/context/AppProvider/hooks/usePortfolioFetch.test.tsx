import type { AccountId } from '@shapeshiftoss/caip'
import { ethChainId, monadChainId, toAccountId } from '@shapeshiftoss/caip'
import { cleanup, renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { Provider as ReduxProvider } from 'react-redux'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { usePortfolioFetch } from './usePortfolioFetch'

import { assets } from '@/state/slices/assetsSlice/assetsSlice'
import { portfolioApi } from '@/state/slices/portfolioSlice/portfolioSlice'
import { store } from '@/state/store'
import { ethereum } from '@/test/mocks/assets'

const address = '0x9124248f2AD8c94fC4a403588BE7a77984B34bb8'
const ethAccountId = toAccountId({ chainId: ethChainId, account: address })
const monadAccountId = toAccountId({ chainId: monadChainId, account: address })

const mocks = vi.hoisted(() => ({
  isAssetServicePending: true,
  enabledWalletAccountIds: [] as AccountId[],
}))

vi.mock('@/hooks/useAssetService/useAssetService', async importOriginal => ({
  ...(await importOriginal<object>()),
  useAssetService: () => ({ isPending: mocks.isAssetServicePending }),
}))

vi.mock('@/hooks/useWallet/useWallet', () => ({
  useWallet: () => ({ state: { isLoadingLocalWallet: false, modal: false, wallet: undefined } }),
}))

vi.mock('@/hooks/useFeatureFlag/useFeatureFlag', () => ({
  useFeatureFlag: () => true,
}))

vi.mock('@/state/slices/selectors', async importOriginal => ({
  ...(await importOriginal<object>()),
  selectEnabledWalletAccountIds: () => mocks.enabledWalletAccountIds,
}))

const wrapper = ({ children }: PropsWithChildren) => (
  <ReduxProvider store={store}>{children}</ReduxProvider>
)

const loadGeneratedAssets = () =>
  store.dispatch(
    assets.actions.setGeneratedAssets({
      byId: { [ethereum.assetId]: ethereum },
      ids: [ethereum.assetId],
      relatedAssetIndex: {},
      version: 'v1',
    }),
  )

describe('usePortfolioFetch', () => {
  const initiate = vi.spyOn(portfolioApi.endpoints.getAccount, 'initiate')

  const fetchedAccountIds = () => initiate.mock.calls.map(([{ accountId }]) => accountId)

  beforeEach(() => {
    initiate.mockReset()
    initiate.mockReturnValue((() => undefined) as unknown as ReturnType<typeof initiate>)
    store.dispatch(assets.actions.clear())
    mocks.enabledWalletAccountIds = [ethAccountId, monadAccountId]
    mocks.isAssetServicePending = true
  })

  // Hooks left mounted would re-run their fetch when a later test changes the store
  afterEach(cleanup)

  it('fetches no accounts while the asset service is loading into an empty store', () => {
    renderHook(() => usePortfolioFetch(), { wrapper })

    expect(fetchedAccountIds()).toEqual([])
  })

  it('fetches accounts that do not scan known tokens once the store has generated assets', () => {
    loadGeneratedAssets()

    renderHook(() => usePortfolioFetch(), { wrapper })

    expect(fetchedAccountIds()).toEqual([ethAccountId])
  })

  it('fetches every account once the asset service has loaded', () => {
    loadGeneratedAssets()
    mocks.isAssetServicePending = false

    renderHook(() => usePortfolioFetch(), { wrapper })

    expect(fetchedAccountIds()).toEqual([ethAccountId, monadAccountId])
  })
})
