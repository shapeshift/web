import { makeAsset } from '@shapeshiftoss/utils'
import { describe, expect, it } from 'vitest'

import { assets, initialState } from './assetsSlice'

import { fox, usdc } from '@/test/mocks/assets'

const foxPlaceholder = makeAsset(
  {},
  { assetId: fox.assetId, symbol: fox.symbol, name: fox.name, precision: fox.precision },
)

describe('assetsSlice', () => {
  describe('addPlaceholderAssets', () => {
    it('does not replace an asset upserted while the placeholder was being built', () => {
      const loaded = assets.reducer(
        initialState,
        assets.actions.upsertAssets({ byId: { [fox.assetId]: fox }, ids: [fox.assetId] }),
      )

      const state = assets.reducer(
        loaded,
        assets.actions.addPlaceholderAssets({
          byId: { [fox.assetId]: foxPlaceholder },
          ids: [fox.assetId],
        }),
      )

      expect(state.byId[fox.assetId]).toEqual(fox)
      expect(state.ids).toEqual([fox.assetId])
    })

    it('adds placeholders for unknown assets', () => {
      const loaded = assets.reducer(
        initialState,
        assets.actions.upsertAssets({ byId: { [usdc.assetId]: usdc }, ids: [usdc.assetId] }),
      )

      const state = assets.reducer(
        loaded,
        assets.actions.addPlaceholderAssets({
          byId: { [fox.assetId]: foxPlaceholder },
          ids: [fox.assetId],
        }),
      )

      expect(state.byId[fox.assetId]).toEqual(foxPlaceholder)
      expect(state.ids).toEqual([usdc.assetId, fox.assetId])
    })

    it('lets the asset service replace a placeholder added before it loaded', () => {
      const withPlaceholder = assets.reducer(
        initialState,
        assets.actions.addPlaceholderAssets({
          byId: { [fox.assetId]: foxPlaceholder },
          ids: [fox.assetId],
        }),
      )

      const state = assets.reducer(
        withPlaceholder,
        assets.actions.upsertAssets({ byId: { [fox.assetId]: fox }, ids: [fox.assetId] }),
      )

      expect(state.byId[fox.assetId]).toEqual(fox)
    })
  })
})
