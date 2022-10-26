import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { mockStore } from 'test/mocks/store'

import { foxEthPair } from './constants'
import type { UserStakingId } from './opportunitiesSlice'
import { initialState } from './opportunitiesSlice'
import {
  selectAggregatedUserStakingOpportunityByStakingId,
  selectLpOpportunityIdsByAccountId,
  selectStakingOpportunityIdsByAccountId,
  selectUserStakingOpportunitiesByStakingId,
  selectUserStakingOpportunityByUserStakingId,
} from './selectors'

describe('opportunitiesSlice selectors', () => {
  const baseState = {
    ...mockStore,
    opportunities: initialState,
  }
  describe('selects IDs', () => {
    const lp = {
      ...initialState.lp,
      byAccountId: {
        'eip155:1:0xgomes': ['eip155:1:0xLpOne', 'eip155:1:0xLpTwo'],
      },
    }
    const staking = {
      ...initialState.staking,
      byAccountId: {
        'eip155:1:0xgomes': ['eip155:1:0xLpOne', 'eip155:1:0xLpTwo'],
      },
    }
    const mockState = {
      ...baseState,
      opportunities: {
        ...initialState,
        lp,
        staking,
      },
    }
    describe('selectLpOpportunityIdsByAccountId', () => {
      it('can get LP opportunities Ids for a given AccountId', () => {
        const result = selectLpOpportunityIdsByAccountId(mockState, {
          accountId: 'eip155:1:0xgomes',
        })

        expect(result).toEqual(['eip155:1:0xLpOne', 'eip155:1:0xLpTwo'])
      })
    })
    describe('selectStakingOpportunityIdsByAccountId', () => {
      it('can get staking opportunities Ids for a given AccountId', () => {
        const result = selectStakingOpportunityIdsByAccountId(mockState, {
          accountId: 'eip155:1:0xgomes',
        })

        expect(result).toEqual(['eip155:1:0xLpOne', 'eip155:1:0xLpTwo'])
      })
    })
  })
  describe('selectUserStakingOpportunityByUserStakingId', () => {
    const staking = {
      ...initialState.staking,
    }
    const userStaking = {
      ...initialState.staking,
      ids: [
        'eip155:1:0xgomes*eip155:1:0xLpTwo',
        'eip155:1:0xgomes*eip155:1:0xLpOne',
        'eip155:1:0xfauxmes*eip155:1:0xLpOne',
      ] as UserStakingId[],
      byId: {
        'eip155:1:0xgomes*eip155:1:0xLpTwo': {
          stakedAmountCryptoPrecision: '1337',
          rewardsAmountCryptoPrecision: '420',
        },
        'eip155:1:0xgomes*eip155:1:0xLpOne': {
          stakedAmountCryptoPrecision: '4',
          rewardsAmountCryptoPrecision: '3',
        },
      },
    }

    const mockState = {
      ...baseState,
      opportunities: {
        ...initialState,
        staking,
        userStaking,
      },
    }

    it('can get the staking data for a given UserStakingId', () => {
      expect(
        selectUserStakingOpportunityByUserStakingId(mockState, {
          userStakingId: 'eip155:1:0xgomes*eip155:1:0xLpTwo',
        }),
      ).toEqual({
        stakedAmountCryptoPrecision: '1337',
        rewardsAmountCryptoPrecision: '420',
      })
      expect(
        selectUserStakingOpportunityByUserStakingId(mockState, {
          userStakingId: 'eip155:1:0xgomes*eip155:1:0xLpOne',
        }),
      ).toEqual({
        stakedAmountCryptoPrecision: '4',
        rewardsAmountCryptoPrecision: '3',
      })
    })
  })
  describe('selects many opportunities', () => {
    const staking = {
      ...initialState.staking,
      byId: {
        'eip155:1:0xLpTwo': {
          apy: '1000',
          assetId: 'eip155:1:0xLpTwo',
          provider: DefiProvider.FoxEthLP,
          tvl: '91283233211',
          type: DefiType.LiquidityPool,
          underlyingAssetIds: foxEthPair,
        },
      },
    }
    const userStaking = {
      ...initialState.staking,
      ids: [
        'eip155:1:0xgomes*eip155:1:0xLpTwo',
        'eip155:1:0xcatpuccino*eip155:1:0xLpTwo',
        'eip155:1:0xgomes*eip155:1:0xLpOne',
      ] as UserStakingId[],
      byId: {
        'eip155:1:0xgomes*eip155:1:0xLpTwo': {
          stakedAmountCryptoPrecision: '1337',
          rewardsAmountCryptoPrecision: '420',
        },
        'eip155:1:0xcatpuccino*eip155:1:0xLpTwo': {
          stakedAmountCryptoPrecision: '100',
          rewardsAmountCryptoPrecision: '10',
        },
        'eip155:1:0xgomes*eip155:1:0xLpOne': {
          stakedAmountCryptoPrecision: '4',
          rewardsAmountCryptoPrecision: '3',
        },
      },
    }

    const mockState = {
      ...baseState,
      opportunities: {
        ...initialState,
        staking,
        userStaking,
      },
    }
    describe('selectUserStakingOpportunitiesByStakingId', () => {
      it('can get the staking data for a given StakingId', () => {
        const result = selectUserStakingOpportunitiesByStakingId(mockState, {
          stakingId: 'eip155:1:0xLpTwo',
        })
        expect(result).toEqual([
          {
            apy: '1000',
            assetId: 'eip155:1:0xLpTwo',
            provider: DefiProvider.FoxEthLP,
            rewardsAmountCryptoPrecision: '420',
            stakedAmountCryptoPrecision: '1337',
            tvl: '91283233211',
            type: DefiType.LiquidityPool,
            underlyingAssetIds: foxEthPair,
            userStakingId: 'eip155:1:0xgomes*eip155:1:0xLpTwo',
          },
          {
            apy: '1000',
            assetId: 'eip155:1:0xLpTwo',
            provider: DefiProvider.FoxEthLP,
            rewardsAmountCryptoPrecision: '10',
            stakedAmountCryptoPrecision: '100',
            tvl: '91283233211',
            type: DefiType.LiquidityPool,
            underlyingAssetIds: foxEthPair,
            userStakingId: 'eip155:1:0xcatpuccino*eip155:1:0xLpTwo',
          },
        ])
      })
    })
    describe('selectAggregatedUserStakingOpportunityByStakingId', () => {
      it('can get the aggregated staking opportunity for a given StakingId', () => {
        const result = selectAggregatedUserStakingOpportunityByStakingId(mockState, {
          stakingId: 'eip155:1:0xLpTwo',
        })
        expect(result).toEqual({
          apy: '1000',
          assetId: 'eip155:1:0xLpTwo',
          provider: DefiProvider.FoxEthLP,
          tvl: '91283233211',
          type: DefiType.LiquidityPool,
          underlyingAssetIds: foxEthPair,
          rewardsAmountCryptoPrecision: '430',
          stakedAmountCryptoPrecision: '1437',
        })
      })
    })
  })
})
