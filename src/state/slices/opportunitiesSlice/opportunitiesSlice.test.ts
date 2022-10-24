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
    describe('upsertAccountIds', () => {
      it('insert AccountIds', () => {
        const expectedByAccountId = {
          'eip155:1/erc20:0xfoo': [],
          'eip155:1/erc20:0xbar': [],
        }
        store.dispatch(
          opportunities.actions.upsertUserAccountIds([
            'eip155:1/erc20:0xfoo',
            'eip155:1/erc20:0xbar',
          ]),
        )
        expect(store.getState().opportunities.lp.byAccountId).toEqual(expectedByAccountId)
        expect(store.getState().opportunities.farming.byAccountId).toEqual(expectedByAccountId)
      })
    })
    describe('upsertOpportunityAccountIds', () => {
      it('insert opportunity Ids', () => {
        const expectedById = {
          'eip155:1/erc20:0xContractFoo': {},
          'eip155:1/erc20:0xContractBar': {},
        }
        const expectedIds = ['eip155:1/erc20:0xContractFoo', 'eip155:1/erc20:0xContractBar']
        store.dispatch(
          opportunities.actions.upsertOpportunityAccountIds([
            'eip155:1/erc20:0xContractFoo',
            'eip155:1/erc20:0xContractBar',
          ]),
        )
        expect(store.getState().opportunities.lp.byId).toEqual(expectedById)
        expect(store.getState().opportunities.farming.byId).toEqual(expectedById)
        expect(store.getState().opportunities.lp.ids).toEqual(expectedIds)
        expect(store.getState().opportunities.farming.ids).toEqual(expectedIds)
      })
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
              underlyingAssetIds: [foxAssetId, ethAssetId],
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
  })

  describe('selectors', () => {
    // TODO
  })
})
