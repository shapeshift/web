import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { makeAsset } from '@shapeshiftoss/utils'
import { describe, expect, it } from 'vitest'

import type { AssetsState } from './assetsSlice'
import { assets, initialState } from './assetsSlice'

import { ethereum, fox, usdc } from '@/test/mocks/assets'

const foxPlaceholder = makeAsset({
  assetId: fox.assetId,
  symbol: fox.symbol,
  name: fox.name,
  precision: fox.precision,
})

const customToken = makeAsset({
  assetId: 'eip155:1/erc20:0x0000000000000000000000000000000000000001',
  symbol: 'CUSTOM',
  name: 'Custom Token',
  precision: 18,
})

const setGeneratedAssets = (
  state: AssetsState,
  generated: Asset[],
  version: string,
  {
    watchedAssetIds = [],
    heldAssetIds = [],
  }: { watchedAssetIds?: AssetId[]; heldAssetIds?: AssetId[] } = {},
) =>
  assets.reducer(
    state,
    assets.actions.setGeneratedAssets({
      byId: Object.fromEntries(generated.map(asset => [asset.assetId, asset])),
      ids: generated.map(asset => asset.assetId),
      relatedAssetIndex: {},
      version,
      watchedAssetIds,
      heldAssetIds,
    }),
  )

describe('assetsSlice', () => {
  describe('setGeneratedAssets', () => {
    it('loads the generated assets into an empty store', () => {
      const state = assets.reducer(
        initialState,
        assets.actions.setGeneratedAssets({
          byId: { [ethereum.assetId]: ethereum, [fox.assetId]: fox },
          ids: [ethereum.assetId, fox.assetId],
          relatedAssetIndex: { [fox.assetId]: [fox.assetId] },
          version: 'v1',
          watchedAssetIds: [],
          heldAssetIds: [],
        }),
      )

      expect(state.byId).toEqual({
        [ethereum.assetId]: ethereum,
        [fox.assetId]: fox,
      })
      expect(state.ids).toEqual([ethereum.assetId, fox.assetId])
      expect(state.relatedAssetIndex).toEqual({ [fox.assetId]: [fox.assetId] })
      expect(state.runtimeAssetIds).toEqual([])
      expect(state.version).toBe('v1')
    })

    it('drops assets removed from the generated data and applies the new order', () => {
      const loaded = setGeneratedAssets(initialState, [ethereum, fox, usdc], 'v1')

      const state = setGeneratedAssets(loaded, [usdc, ethereum], 'v2')

      expect(state.byId[fox.assetId]).toBeUndefined()
      expect(state.ids).toEqual([usdc.assetId, ethereum.assetId])
      expect(state.version).toBe('v2')
    })

    it('keeps the custom assets a user imported, ordered after the generated assets', () => {
      const loaded = setGeneratedAssets(initialState, [ethereum], 'v1')
      const withCustomToken = assets.reducer(loaded, assets.actions.addCustomAsset(customToken))

      const state = setGeneratedAssets(withCustomToken, [ethereum, usdc], 'v2')

      expect(state.byId[customToken.assetId]).toEqual(customToken)
      expect(state.ids).toEqual([ethereum.assetId, usdc.assetId, customToken.assetId])
      expect(state.runtimeAssetIds).toEqual([customToken.assetId])
      expect(state.customAssetIds).toEqual([customToken.assetId])
    })

    it('keeps the runtime assets a user is watching', () => {
      const loaded = setGeneratedAssets(initialState, [ethereum], 'v1')
      const withSearchResult = assets.reducer(loaded, assets.actions.upsertAsset(customToken))

      const state = setGeneratedAssets(withSearchResult, [ethereum], 'v2', {
        watchedAssetIds: [ethereum.assetId, customToken.assetId],
      })

      expect(state.ids).toEqual([ethereum.assetId, customToken.assetId])
      expect(state.runtimeAssetIds).toEqual([customToken.assetId])
      expect(state.customAssetIds).toEqual([])
    })

    it('keeps a watched asset that was removed from the generated data', () => {
      const loaded = setGeneratedAssets(initialState, [ethereum, fox], 'v1')

      const state = setGeneratedAssets(loaded, [ethereum], 'v2', { watchedAssetIds: [fox.assetId] })

      expect(state.byId[fox.assetId]).toEqual(fox)
      expect(state.ids).toEqual([ethereum.assetId, fox.assetId])
      expect(state.runtimeAssetIds).toEqual([fox.assetId])
    })

    it('keeps the placeholders for assets a user holds', () => {
      const loaded = setGeneratedAssets(initialState, [ethereum], 'v1')
      const withPlaceholder = assets.reducer(
        loaded,
        assets.actions.addPlaceholderAssets({
          byId: { [fox.assetId]: foxPlaceholder },
          ids: [fox.assetId],
        }),
      )

      const state = setGeneratedAssets(withPlaceholder, [ethereum], 'v2', {
        heldAssetIds: [ethereum.assetId, fox.assetId],
      })

      expect(state.byId[fox.assetId]).toEqual(foxPlaceholder)
      expect(state.ids).toEqual([ethereum.assetId, fox.assetId])
      expect(state.runtimeAssetIds).toEqual([fox.assetId])
      expect(state.customAssetIds).toEqual([])
    })

    it('rebuilds a held asset that is not tracked as a runtime asset', () => {
      const untracked: AssetsState = {
        ...initialState,
        byId: { [ethereum.assetId]: ethereum, [fox.assetId]: foxPlaceholder },
        ids: [ethereum.assetId, fox.assetId],
      }

      const state = setGeneratedAssets(untracked, [ethereum], 'v1', { heldAssetIds: [fox.assetId] })

      expect(state.byId[fox.assetId]).toBeUndefined()
      expect(state.ids).toEqual([ethereum.assetId])
    })

    it('drops the runtime assets a user did not import, is not watching and does not hold', () => {
      const loaded = setGeneratedAssets(initialState, [ethereum], 'v1')
      const withPlaceholder = assets.reducer(
        loaded,
        assets.actions.addPlaceholderAssets({
          byId: { [fox.assetId]: foxPlaceholder },
          ids: [fox.assetId],
        }),
      )
      const withSearchResult = assets.reducer(
        withPlaceholder,
        assets.actions.upsertAsset(customToken),
      )

      const state = setGeneratedAssets(withSearchResult, [ethereum], 'v2')

      expect(state.ids).toEqual([ethereum.assetId])
      expect(state.byId[fox.assetId]).toBeUndefined()
      expect(state.byId[customToken.assetId]).toBeUndefined()
      expect(state.runtimeAssetIds).toEqual([])
    })

    it('stops tracking a custom asset the generated data now covers', () => {
      const withCustomFox = assets.reducer(
        initialState,
        assets.actions.addCustomAsset(foxPlaceholder),
      )

      const state = setGeneratedAssets(withCustomFox, [ethereum, fox], 'v1')

      expect(state.byId[fox.assetId]).toEqual(fox)
      expect(state.ids).toEqual([ethereum.assetId, fox.assetId])
      expect(state.runtimeAssetIds).toEqual([])
      expect(state.customAssetIds).toEqual([])
    })
  })

  describe('addPlaceholderAssets', () => {
    it('does not replace an asset loaded while the placeholder was being built', () => {
      const loaded = setGeneratedAssets(initialState, [fox], 'v1')

      const state = assets.reducer(
        loaded,
        assets.actions.addPlaceholderAssets({
          byId: { [fox.assetId]: foxPlaceholder },
          ids: [fox.assetId],
        }),
      )

      expect(state.byId[fox.assetId]).toEqual(fox)
      expect(state.ids).toEqual([fox.assetId])
      expect(state.runtimeAssetIds).toEqual([])
    })

    it('tracks a placeholder once when the same asset is listed twice', () => {
      const state = assets.reducer(
        initialState,
        assets.actions.addPlaceholderAssets({
          byId: { [fox.assetId]: foxPlaceholder },
          ids: [fox.assetId, fox.assetId],
        }),
      )

      expect(state.ids).toEqual([fox.assetId])
      expect(state.runtimeAssetIds).toEqual([fox.assetId])
    })

    it('adds placeholders for unknown assets as runtime assets', () => {
      const loaded = setGeneratedAssets(initialState, [usdc], 'v1')

      const state = assets.reducer(
        loaded,
        assets.actions.addPlaceholderAssets({
          byId: { [fox.assetId]: foxPlaceholder },
          ids: [fox.assetId],
        }),
      )

      expect(state.byId[fox.assetId]).toEqual(foxPlaceholder)
      expect(state.ids).toEqual([usdc.assetId, fox.assetId])
      expect(state.runtimeAssetIds).toEqual([fox.assetId])
    })
  })

  describe('upsertAssets', () => {
    it('tracks new assets as runtime assets, but not updates to generated assets', () => {
      const loaded = setGeneratedAssets(initialState, [fox], 'v1')
      const describedFox = { ...fox, description: 'FOX token' }

      const state = assets.reducer(
        loaded,
        assets.actions.upsertAssets({
          byId: {
            [fox.assetId]: describedFox,
            [customToken.assetId]: customToken,
          },
          ids: [fox.assetId, customToken.assetId],
        }),
      )

      expect(state.byId[fox.assetId]).toEqual(describedFox)
      expect(state.runtimeAssetIds).toEqual([customToken.assetId])
    })
  })

  describe('upsertAsset', () => {
    it('tracks a new asset as a runtime asset once', () => {
      const added = assets.reducer(initialState, assets.actions.upsertAsset(customToken))
      const state = assets.reducer(added, assets.actions.upsertAsset(customToken))

      expect(state.ids).toEqual([customToken.assetId])
      expect(state.runtimeAssetIds).toEqual([customToken.assetId])
    })
  })

  describe('addCustomAsset', () => {
    it('adds the asset as a custom runtime asset', () => {
      const state = assets.reducer(initialState, assets.actions.addCustomAsset(customToken))

      expect(state.byId[customToken.assetId]).toEqual(customToken)
      expect(state.ids).toEqual([customToken.assetId])
      expect(state.runtimeAssetIds).toEqual([customToken.assetId])
      expect(state.customAssetIds).toEqual([customToken.assetId])
    })

    it('makes an asset the app already came across a custom asset', () => {
      const withSearchResult = assets.reducer(initialState, assets.actions.upsertAsset(customToken))

      const state = assets.reducer(withSearchResult, assets.actions.addCustomAsset(customToken))

      expect(state.ids).toEqual([customToken.assetId])
      expect(state.runtimeAssetIds).toEqual([customToken.assetId])
      expect(state.customAssetIds).toEqual([customToken.assetId])
    })

    it('leaves a generated asset as it is', () => {
      const loaded = setGeneratedAssets(initialState, [fox], 'v1')

      const state = assets.reducer(loaded, assets.actions.addCustomAsset(foxPlaceholder))

      expect(state.byId[fox.assetId]).toEqual(fox)
      expect(state.customAssetIds).toEqual([])
    })
  })

  describe('clear', () => {
    it('resets to an empty store with no version, so the next load replaces', () => {
      const loaded = setGeneratedAssets(initialState, [ethereum, fox], 'v1')

      expect(assets.reducer(loaded, assets.actions.clear())).toEqual({
        byId: {},
        ids: [],
        relatedAssetIndex: {},
        runtimeAssetIds: [],
        customAssetIds: [],
        version: undefined,
      })
    })
  })
})
