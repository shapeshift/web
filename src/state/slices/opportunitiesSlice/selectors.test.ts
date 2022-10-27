import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { mockStore } from 'test/mocks/store'

import { foxEthPair } from './constants'
import type { UserStakingId } from './opportunitiesSlice'
import { initialState } from './opportunitiesSlice'
import {
  selectAggregatedUserStakingOpportunityByStakingId,
  selectHighestBalanceAccountIdIdByLpId,
  selectHighestBalanceAccountIdIdByStakingId,
  selectLpOpportunityIdsByAccountId,
  selectStakingOpportunityIdsByAccountId,
  selectUserStakingOpportunitiesByStakingId,
  selectUserStakingOpportunityByUserStakingId,
} from './selectors'
import { serializeUserStakingId } from './utils'

describe('opportunitiesSlice selectors', () => {
  const baseState = {
    ...mockStore,
    opportunities: initialState,
  }
  describe('selects ID/s', () => {
    const accountBalances = {
      byId: {
        'eip155:1:0xgomes': {
          'eip155:1:0xLpContractOne': '1337',
        },
        'eip155:1:0xfauxmes': {
          'eip155:1:0xLpContractOne': '424242',
        },
      },
      ids: ['eip155:1:0xgomes', 'eip155:1:fauxmes'],
    }
    const lp = {
      ...initialState.lp,
      byAccountId: {
        'eip155:1:0xgomes': ['eip155:1:0xLpContractOne', 'eip155:1:0xLpContractTwo'],
        'eip155:1:fauxmes': ['eip155:1:0xLpContractOne'],
      },
      ids: ['eip155:1:0xLpContractOne', 'eip155:1:0xLpContractTwo'],
    }
    const staking = {
      ...initialState.staking,
      byAccountId: {
        'eip155:1:0xgomes': ['eip155:1:0xLpContractOne', 'eip155:1:0xLpContractTwo'],
        'eip155:1:fauxmes': ['eip155:1:0xLpContractOne'],
      },
      ids: ['eip155:1:0xLpContractOne', 'eip155:1:0xLpContractTwo'],
    }
    const userStaking = {
      ...initialState.staking,
      ids: [
        serializeUserStakingId('eip155:1:0xgomes', 'eip155:1:0xLpContractTwo'),
        serializeUserStakingId('eip155:1:0xgomes', 'eip155:1:0xLpContractOne'),
        serializeUserStakingId('eip155:1:0xfauxmes', 'eip155:1:0xLpContractOne'),
      ],
      byId: {
        [serializeUserStakingId('eip155:1:0xgomes', 'eip155:1:0xLpContractTwo')]: {
          stakedAmountCryptoPrecision: '1337',
          rewardsAmountCryptoPrecision: '420',
        },
        [serializeUserStakingId('eip155:1:0xgomes', 'eip155:1:0xLpContractOne')]: {
          stakedAmountCryptoPrecision: '4',
          rewardsAmountCryptoPrecision: '3',
        },
        [serializeUserStakingId('eip155:1:0xfauxmes', 'eip155:1:0xLpContractOne')]: {
          stakedAmountCryptoPrecision: '9000',
          rewardsAmountCryptoPrecision: '1',
        },
      },
    }

    const mockState = {
      ...baseState,
      portfolio: {
        ...baseState.portfolio,
        accountBalances,
      },
      opportunities: {
        ...initialState,
        lp,
        staking,
        userStaking,
      },
    }
    describe('selectLpOpportunityIdsByAccountId', () => {
      it('can get LP opportunities Ids for a given AccountId', () => {
        const result = selectLpOpportunityIdsByAccountId(mockState, {
          accountId: 'eip155:1:0xgomes',
        })

        expect(result).toEqual(['eip155:1:0xLpContractOne', 'eip155:1:0xLpContractTwo'])
      })
    })
    describe('selectStakingOpportunityIdsByAccountId', () => {
      it('can get staking opportunities Ids for a given AccountId', () => {
        const result = selectStakingOpportunityIdsByAccountId(mockState, {
          accountId: 'eip155:1:0xgomes',
        })

        expect(result).toEqual(['eip155:1:0xLpContractOne', 'eip155:1:0xLpContractTwo'])
      })
    })
    describe('selectHighestBalanceLpUserStakingIdByStakingId', () => {
      it('can get the highest balance AccuontId for a given StakingId', () => {
        const result = selectHighestBalanceAccountIdIdByStakingId(mockState, {
          stakingId: 'eip155:1:0xLpContractOne',
        })

        expect(result).toEqual('eip155:1:0xfauxmes')
      })
    })
    describe('selectHighestBalanceAccountIdIdByLpId', () => {
      it('can get the highest balance AccountId for a given LpId', () => {
        const result = selectHighestBalanceAccountIdIdByLpId(mockState, {
          lpId: 'eip155:1:0xLpContractOne',
        })

        expect(result).toEqual('eip155:1:0xfauxmes')
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
        serializeUserStakingId('eip155:1:0xgomes', 'eip155:1:0xLpContractTwo'),
        serializeUserStakingId('eip155:1:0xgomes', 'eip155:1:0xLpContractOne'),
        serializeUserStakingId('eip155:1:0xfauxmes', 'eip155:1:0xLpContractOne'),
      ],
      byId: {
        [serializeUserStakingId('eip155:1:0xgomes', 'eip155:1:0xLpContractTwo')]: {
          stakedAmountCryptoPrecision: '1337',
          rewardsAmountCryptoPrecision: '420',
        },
        [serializeUserStakingId('eip155:1:0xgomes', 'eip155:1:0xLpContractOne')]: {
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
          userStakingId: serializeUserStakingId('eip155:1:0xgomes', 'eip155:1:0xLpContractTwo'),
        }),
      ).toEqual({
        stakedAmountCryptoPrecision: '1337',
        rewardsAmountCryptoPrecision: '420',
      })
      expect(
        selectUserStakingOpportunityByUserStakingId(mockState, {
          userStakingId: serializeUserStakingId('eip155:1:0xgomes', 'eip155:1:0xLpContractOne'),
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
        'eip155:1:0xLpContractTwo': {
          apy: '1000',
          assetId: 'eip155:1:0xLpContractTwo',
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
        serializeUserStakingId('eip155:1:0xgomes', 'eip155:1:0xLpContractTwo'),
        serializeUserStakingId('eip155:1:0xcatpuccino', 'eip155:1:0xLpContractTwo'),
        serializeUserStakingId('eip155:1:0xgomes', 'eip155:1:0xLpContractOne'),
      ],
      byId: {
        [serializeUserStakingId('eip155:1:0xgomes', 'eip155:1:0xLpContractTwo')]: {
          stakedAmountCryptoPrecision: '1337',
          rewardsAmountCryptoPrecision: '420',
        },
        [serializeUserStakingId('eip155:1:0xcatpuccino', 'eip155:1:0xLpContractTwo')]: {
          stakedAmountCryptoPrecision: '100',
          rewardsAmountCryptoPrecision: '10',
        },
        [serializeUserStakingId('eip155:1:0xgomes', 'eip155:1:0xLpContractOne')]: {
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
          stakingId: 'eip155:1:0xLpContractTwo',
        })
        expect(result).toEqual([
          {
            apy: '1000',
            assetId: 'eip155:1:0xLpContractTwo',
            provider: DefiProvider.FoxEthLP,
            rewardsAmountCryptoPrecision: '420',
            stakedAmountCryptoPrecision: '1337',
            tvl: '91283233211',
            type: DefiType.LiquidityPool,
            underlyingAssetIds: foxEthPair,
            userStakingId: serializeUserStakingId('eip155:1:0xgomes', 'eip155:1:0xLpContractTwo'),
          },
          {
            apy: '1000',
            assetId: 'eip155:1:0xLpContractTwo',
            provider: DefiProvider.FoxEthLP,
            rewardsAmountCryptoPrecision: '10',
            stakedAmountCryptoPrecision: '100',
            tvl: '91283233211',
            type: DefiType.LiquidityPool,
            underlyingAssetIds: foxEthPair,
            userStakingId: serializeUserStakingId(
              'eip155:1:0xcatpuccino',
              'eip155:1:0xLpContractTwo',
            ),
          },
        ])
      })
    })
    describe('selectAggregatedUserStakingOpportunityByStakingId', () => {
      it('can get the aggregated staking opportunity for a given StakingId', () => {
        const result = selectAggregatedUserStakingOpportunityByStakingId(mockState, {
          stakingId: 'eip155:1:0xLpContractTwo',
        })
        expect(result).toEqual({
          apy: '1000',
          assetId: 'eip155:1:0xLpContractTwo',
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
