import type { AccountId } from '@shapeshiftoss/caip'
import { ethChainId, monadChainId, toAccountId } from '@shapeshiftoss/caip'
import { cleanup, renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { Provider as ReduxProvider } from 'react-redux'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { usePortfolioFetch } from './usePortfolioFetch'

import { portfolioApi } from '@/state/slices/portfolioSlice/portfolioSlice'
import { store } from '@/state/store'

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

describe('usePortfolioFetch', () => {
  const initiate = vi.spyOn(portfolioApi.endpoints.getAccount, 'initiate')

  const fetchedAccountIds = () => initiate.mock.calls.map(([{ accountId }]) => accountId)

  beforeEach(() => {
    initiate.mockReset()
    initiate.mockReturnValue((() => undefined) as unknown as ReturnType<typeof initiate>)
    mocks.enabledWalletAccountIds = [ethAccountId, monadAccountId]
  })

  afterEach(cleanup)

  it('fetches no accounts while the asset service is loading', () => {
    mocks.isAssetServicePending = true

    renderHook(() => usePortfolioFetch(), { wrapper })

    expect(fetchedAccountIds()).toEqual([])
  })

  it('fetches every account once the asset service has loaded', () => {
    mocks.isAssetServicePending = false

    renderHook(() => usePortfolioFetch(), { wrapper })

    expect(fetchedAccountIds()).toEqual([ethAccountId, monadAccountId])
  })

  it('fetches the accounts when the asset service finishes loading', () => {
    mocks.isAssetServicePending = true
    const { rerender } = renderHook(() => usePortfolioFetch(), { wrapper })

    mocks.isAssetServicePending = false
    rerender()

    expect(fetchedAccountIds()).toEqual([ethAccountId, monadAccountId])
  })
})
