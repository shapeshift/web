import type { AssetId } from '@shapeshiftoss/caip'
import { ethAssetId, foxAssetId } from '@shapeshiftoss/caip'
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { clearState, store } from 'state/store'

import { foxEthLpAssetId } from './constants'
import { initialState, opportunities } from './opportunitiesSlice'
import { serializeUserStakingId } from './utils'

describe('opportunitiesSlice', () => {
  beforeEach(() => {
    clearState()
  })

  it('returns uninitialized properties for initialState', async () => {
    expect(store.getState().opportunities).toEqual(initialState)
  })

  describe('reducers', () => {
    beforeEach(() => {
      store.dispatch(opportunities.actions.clear())
    })
    describe('clear', () => {
      it.todo('clears state back to initial state')
    })
    describe('upsertOpportunityMetadata', () => {
      it('insert metadata', () => {
        const payload = {
          metadata: {
            'eip155:1:0xMyContract': {
              // The LP token AssetId
              assetId: foxEthLpAssetId,
              provider: DefiProvider.FoxEthLP,
              tvl: '424242',
              apy: '0.42',
              type: DefiType.LiquidityPool,
              underlyingAssetIds: [foxAssetId, ethAssetId] as [AssetId, AssetId],
            },
          },
          type: 'lp' as const,
        }
        const expected = {
          'eip155:1:0xMyContract': {
            apy: '0.42',
            assetId: foxEthLpAssetId,
            provider: DefiProvider.FoxEthLP,
            tvl: '424242',
            type: DefiType.LiquidityPool,
            underlyingAssetIds: [foxAssetId, ethAssetId],
          },
        }
        store.dispatch(opportunities.actions.upsertOpportunityMetadata(payload))
        expect(store.getState().opportunities.lp.byId).toEqual(expected)
      })
    })
    describe('upsertUserStakingOpportunities', () => {
      it('insert user data', () => {
        const payload = {
          [serializeUserStakingId('eip155:1/erc20:0xgomes', 'eip155:1:0xMyContract')]: {
            stakedAmountCryptoPrecision: '42000',
            rewardsAmountCryptoPrecision: '42',
          },
        }
        store.dispatch(opportunities.actions.upsertUserStakingOpportunities(payload))
        expect(store.getState().opportunities.userStaking.byId).toEqual(payload)
        expect(store.getState().opportunities.userStaking.ids).toEqual(Object.keys(payload))
      })
    })
  })
})
