import type { AssetId } from '@shapeshiftoss/caip'
import { ethAssetId, foxAssetId } from '@shapeshiftoss/caip'
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { clearState, store } from 'state/store'

import { initialState, opportunities } from './opportunitiesSlice'

const foxEthLpAssetId = 'eip155:1/erc20:0x470e8de2ebaef52014a47cb5e6af86884947f08c'

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
            assetId: 'eip155:1/erc20:0x470e8de2ebaef52014a47cb5e6af86884947f08c',
            provider: 'UNI V2',
            tvl: '424242',
            type: 'liquidity_pool',
            underlyingAssetIds: [
              'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
              'eip155:1/slip44:60',
            ],
          },
        }
        store.dispatch(opportunities.actions.upsertOpportunityMetadata(payload))
        expect(store.getState().opportunities.lp.byId).toEqual(expected)
      })
    })
    describe('upsertUserStakingOpportunity', () => {
      it('insert user data', () => {
        const payload = {
          'eip155:1/erc20:0xgomes::eip155:1:0xMyContract': {
            stakedAmountCryptoPrecision: '42000',
            rewardsAmountCryptoPrecision: '42',
          },
        }
        const expected = {
          'eip155:1/erc20:0xgomes::eip155:1:0xMyContract': {
            rewardsAmountCryptoPrecision: '42',
            stakedAmountCryptoPrecision: '42000',
          },
        }
        store.dispatch(opportunities.actions.upsertUserStakingOpportunity(payload))
        expect(store.getState().opportunities.staking.byId).toEqual(expected)
      })
    })
  })

  describe('selectors', () => {
    // TODO
  })
})
