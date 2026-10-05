import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { Provider as ReduxProvider } from 'react-redux'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAssetService } from './useAssetService'

import type { GetLoadedAssets } from '@/lib/asset-service'
import { assets } from '@/state/slices/assetsSlice/assetsSlice'
import { store } from '@/state/store'
import { ethereum, fox, usdc } from '@/test/mocks/assets'

const mocks = vi.hoisted(() => ({
  getLoadedAssets: undefined as GetLoadedAssets | undefined,
  service: {
    assetsById: {} as Record<AssetId, Asset>,
    assetIds: [] as AssetId[],
    relatedAssetIndex: {},
    version: undefined as string | undefined,
  },
}))

vi.mock('@/lib/asset-service', async importOriginal => ({
  ...(await importOriginal<object>()),
  initAssetService: (getLoadedAssets: GetLoadedAssets) => {
    mocks.getLoadedAssets = getLoadedAssets
    return Promise.resolve()
  },
  getAssetService: () => mocks.service,
}))

const setServiceAssets = (serviceAssets: Asset[], version: string | undefined) => {
  mocks.service.assetsById = Object.fromEntries(serviceAssets.map(asset => [asset.assetId, asset]))
  mocks.service.assetIds = serviceAssets.map(asset => asset.assetId)
  mocks.service.version = version
}

// A fresh query client per load stands in for a page load
const loadAssetService = async () => {
  const queryClient = new QueryClient()
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
      <ReduxProvider store={store}>{children}</ReduxProvider>
    </QueryClientProvider>
  )

  const { result } = renderHook(() => useAssetService(), { wrapper })
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
}

describe('useAssetService', () => {
  beforeEach(() => {
    store.dispatch(assets.actions.clear())
  })

  it('loads the assets into an empty store', async () => {
    setServiceAssets([ethereum, fox], 'v1')

    await loadAssetService()

    expect(store.getState().assets.ids).toEqual([ethereum.assetId, fox.assetId])
    expect(store.getState().assets.version).toBe('v1')
  })

  it('leaves the store untouched when the version is unchanged', async () => {
    setServiceAssets([ethereum, fox], 'v1')
    await loadAssetService()
    const { byId, ids } = store.getState().assets

    await loadAssetService()

    expect(store.getState().assets.byId).toBe(byId)
    expect(store.getState().assets.ids).toBe(ids)
  })

  it('replaces the assets when the version changes', async () => {
    setServiceAssets([ethereum, fox], 'v1')
    await loadAssetService()

    setServiceAssets([ethereum], 'v2')
    await loadAssetService()

    expect(store.getState().assets.ids).toEqual([ethereum.assetId])
    expect(store.getState().assets.byId[fox.assetId]).toBeUndefined()
    expect(store.getState().assets.version).toBe('v2')
  })

  it('offers the service the generated assets in the store for the version they were loaded from', async () => {
    setServiceAssets([ethereum, fox], 'v1')
    await loadAssetService()
    store.dispatch(assets.actions.upsertAsset(usdc))

    expect(mocks.getLoadedAssets?.('v2')).toBeUndefined()
    expect(mocks.getLoadedAssets?.('v1')).toEqual({
      assetsById: { [ethereum.assetId]: ethereum, [fox.assetId]: fox },
      assetIds: [ethereum.assetId, fox.assetId],
      relatedAssetIndex: {},
    })
  })

  it('always replaces the assets for an unversioned build', async () => {
    setServiceAssets([ethereum, fox], undefined)
    await loadAssetService()

    setServiceAssets([ethereum], undefined)
    await loadAssetService()

    expect(store.getState().assets.ids).toEqual([ethereum.assetId])
  })
})
