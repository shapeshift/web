import type { AssetId } from '@shapeshiftoss/caip'
import { ethAssetId, foxAssetId } from '@shapeshiftoss/caip'
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { mockStore } from 'test/mocks/store'
import type {
  OpportunitiesState,
  OpportunityId,
  OpportunityMetadata,
} from 'state/slices/opportunitiesSlice/types'

import { foxEthLpAssetId, foxEthPair, foxEthStakingAssetIdV5 } from '../constants'
import {
  catpuccinoAccountId,
  fauxmesAccountId,
  gomesAccountId,
  mockLpContractOne,
  mockLpContractTwo,
  mockStakingContractOne,
  mockStakingContractTwo,
} from '../mocks'
import { initialState } from '../opportunitiesSlice'
import {
  selectAggregatedUserStakingOpportunityByStakingId,
  selectHighestBalanceAccountIdByLpId,
  selectHighestBalanceAccountIdByStakingId,
  selectLpOpportunityIdsByAccountId,
  selectStakingOpportunityIdsByAccountId,
  selectUserStakingOpportunitiesFromStakingId,
  selectUserStakingOpportunityByUserStakingId,
} from '../selectors'
import { serializeUserStakingId } from '../utils'

describe('opportunitiesSlice selectors', () => {
  const walletId = 'walletId'
  const wallet = {
    byId: {
      [walletId]: [gomesAccountId, fauxmesAccountId, catpuccinoAccountId],
    },
    ids: [walletId],
  }
  const mockBaseState = {
    ...mockStore,
    opportunities: initialState,
    portfolio: {
      ...mockStore.portfolio,
      walletId,
      wallet,
    },
  }
  describe('selects ID/s', () => {
    const accountMetadata = {
      byId: {},
      ids: [gomesAccountId, fauxmesAccountId],
    }
    const accountBalances = {
      byId: {
        [gomesAccountId]: {
          [mockLpContractOne]: '1337',
        },
        [fauxmesAccountId]: {
          [mockLpContractOne]: '424242',
        },
      },
      ids: [gomesAccountId, fauxmesAccountId],
    }
    const lp = {
      ...initialState.lp,
      byAccountId: {
        [gomesAccountId]: [mockLpContractOne, mockLpContractTwo],
        [fauxmesAccountId]: [mockLpContractOne],
      },
      ids: [mockLpContractOne, mockLpContractTwo],
    }
    const staking = {
      ...initialState.staking,
      byAccountId: {
        [gomesAccountId]: [mockStakingContractOne, mockStakingContractTwo],
        [fauxmesAccountId]: [mockStakingContractOne],
      },
      ids: [mockStakingContractOne, mockStakingContractTwo],
    }
    const userStaking: OpportunitiesState['userStaking'] = {
      ...initialState.staking,
      ids: [
        serializeUserStakingId(gomesAccountId, mockStakingContractTwo),
        serializeUserStakingId(gomesAccountId, mockStakingContractOne),
        serializeUserStakingId(fauxmesAccountId, mockStakingContractOne),
      ],
      byId: {
        [serializeUserStakingId(gomesAccountId, mockStakingContractTwo)]: {
          userStakingId: serializeUserStakingId(gomesAccountId, mockStakingContractTwo),
          stakedAmountCryptoBaseUnit: '1337',
          rewardsCryptoBaseUnit: {
            amounts: ['420000000000000000000'] as [string],
            claimable: true,
          },
        },
        [serializeUserStakingId(gomesAccountId, mockStakingContractOne)]: {
          userStakingId: serializeUserStakingId(gomesAccountId, mockStakingContractOne),
          stakedAmountCryptoBaseUnit: '4',
          rewardsCryptoBaseUnit: { amounts: ['3000000000000000000'] as [string], claimable: true },
        },
        [serializeUserStakingId(fauxmesAccountId, mockStakingContractOne)]: {
          userStakingId: serializeUserStakingId(fauxmesAccountId, mockStakingContractOne),
          stakedAmountCryptoBaseUnit: '9000',
          rewardsCryptoBaseUnit: { amounts: ['1000000000000000000'] as [string], claimable: true },
        },
      },
    }

    const mockState = {
      ...mockBaseState,
      portfolio: {
        ...mockBaseState.portfolio,
        accountBalances,
        accountMetadata,
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
          accountId: gomesAccountId,
        })

        expect(result).toEqual([mockLpContractOne, mockLpContractTwo])
      })
    })
    describe('selectStakingOpportunityIdsByAccountId', () => {
      it('can get staking opportunities Ids for a given AccountId', () => {
        const result = selectStakingOpportunityIdsByAccountId(mockState, {
          accountId: gomesAccountId,
        })

        expect(result).toEqual([mockStakingContractOne, mockStakingContractTwo])
      })
    })
    describe('selectHighestBalanceLpUserStakingIdByStakingId', () => {
      it('can get the highest balance AccountId for a given StakingId', () => {
        const result = selectHighestBalanceAccountIdByStakingId(mockState, {
          stakingId: mockStakingContractOne,
        })

        expect(result).toEqual(fauxmesAccountId)
      })
    })
    describe('selectHighestBalanceAccountIdByLpId', () => {
      it('can get the highest balance AccountId for a given LpId', () => {
        const result = selectHighestBalanceAccountIdByLpId(mockState, {
          lpId: mockLpContractOne,
        })

        expect(result).toEqual(fauxmesAccountId)
      })
    })
  })
  describe('selectUserStakingOpportunityByUserStakingId', () => {
    const mockOpportunityMetadata: OpportunityMetadata = {
      // The LP token AssetId
      assetId: foxEthLpAssetId,
      id: foxEthLpAssetId,
      name: 'ETH/FOX LP',
      provider: DefiProvider.UniV2,
      tvl: '424242',
      apy: '0.42',
      type: DefiType.LiquidityPool,
      underlyingAssetId: foxEthLpAssetId,
      underlyingAssetIds: [foxAssetId, ethAssetId] as [AssetId, AssetId],
      underlyingAssetRatiosBaseUnit: ['5000000000000000', '202200000000000000000'] as [
        string,
        string,
      ],
      rewardAssetIds: [] as const,
      isClaimableRewards: false,
    }
    const mockOpportunityMetadataTwo: OpportunityMetadata = {
      // The LP token AssetId
      assetId: foxEthStakingAssetIdV5,
      id: foxEthStakingAssetIdV5 as OpportunityId,
      name: 'ETH/FOX Farming',
      provider: DefiProvider.EthFoxStaking,
      tvl: '424242',
      apy: '0.42',
      type: DefiType.Staking,
      underlyingAssetId: foxEthLpAssetId,
      underlyingAssetIds: [foxAssetId, ethAssetId] as [AssetId, AssetId],
      underlyingAssetRatiosBaseUnit: ['5000000000000000', '202200000000000000000'] as [
        string,
        string,
      ],
      rewardAssetIds: [] as const,
      isClaimableRewards: true,
    }

    const staking = {
      ...initialState.staking,
      ids: [
        serializeUserStakingId(gomesAccountId, mockStakingContractTwo),
        serializeUserStakingId(gomesAccountId, mockStakingContractOne),
        serializeUserStakingId(fauxmesAccountId, mockStakingContractOne),
      ],
      byId: {
        [mockStakingContractOne]: mockOpportunityMetadata,
        [mockStakingContractTwo]: mockOpportunityMetadataTwo,
      },
    }
    const userStaking: OpportunitiesState['userStaking'] = {
      ...initialState.userStaking,
      ids: [
        serializeUserStakingId(gomesAccountId, mockStakingContractTwo),
        serializeUserStakingId(gomesAccountId, mockStakingContractOne),
        serializeUserStakingId(fauxmesAccountId, mockStakingContractOne),
      ],
      byId: {
        [serializeUserStakingId(gomesAccountId, mockStakingContractTwo)]: {
          userStakingId: serializeUserStakingId(gomesAccountId, mockStakingContractTwo),
          stakedAmountCryptoBaseUnit: '1337',
          rewardsCryptoBaseUnit: {
            amounts: ['420000000000000000000'] as [string],
            claimable: true,
          },
        },
        [serializeUserStakingId(gomesAccountId, mockStakingContractOne)]: {
          userStakingId: serializeUserStakingId(gomesAccountId, mockStakingContractOne),
          stakedAmountCryptoBaseUnit: '4',
          rewardsCryptoBaseUnit: { amounts: ['3000000000000000000'] as [string], claimable: true },
        },
      },
    }

    const mockState = {
      ...mockBaseState,
      opportunities: {
        ...initialState,
        staking,
        userStaking,
      },
    }

    it('can get the staking data for a given UserStakingId', () => {
      expect(
        selectUserStakingOpportunityByUserStakingId(mockState, {
          userStakingId: serializeUserStakingId(gomesAccountId, mockStakingContractTwo),
        }),
      ).toEqual({
        apy: '0.42',
        assetId: foxEthStakingAssetIdV5,
        id: foxEthStakingAssetIdV5,
        userStakingId: 'eip155:1:0xgomes*eip155:1:0xStakingContractTwo',
        name: 'ETH/FOX Farming',
        provider: DefiProvider.EthFoxStaking,
        rewardsCryptoBaseUnit: { amounts: ['420000000000000000000'], claimable: true },
        stakedAmountCryptoBaseUnit: '1337',
        tvl: '424242',
        type: 'staking',
        underlyingAssetId: 'eip155:1/erc20:0x470e8de2ebaef52014a47cb5e6af86884947f08c',
        underlyingAssetIds: [
          'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
          'eip155:1/slip44:60',
        ],
        underlyingAssetRatiosBaseUnit: ['5000000000000000', '202200000000000000000'],
        rewardAssetIds: [],
        isClaimableRewards: true,
      })
      expect(
        selectUserStakingOpportunityByUserStakingId(mockState, {
          userStakingId: serializeUserStakingId(gomesAccountId, mockStakingContractOne),
        }),
      ).toEqual({
        apy: '0.42',
        assetId: 'eip155:1/erc20:0x470e8de2ebaef52014a47cb5e6af86884947f08c',
        id: 'eip155:1/erc20:0x470e8de2ebaef52014a47cb5e6af86884947f08c',
        userStakingId: 'eip155:1:0xgomes*eip155:1:0xStakingContractOne',
        name: 'ETH/FOX LP',
        provider: DefiProvider.UniV2,
        stakedAmountCryptoBaseUnit: '4',
        rewardsCryptoBaseUnit: { amounts: ['3000000000000000000'] as [string], claimable: true },
        tvl: '424242',
        type: 'lp',
        underlyingAssetId: 'eip155:1/erc20:0x470e8de2ebaef52014a47cb5e6af86884947f08c',
        underlyingAssetIds: [
          'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
          'eip155:1/slip44:60',
        ],
        underlyingAssetRatiosBaseUnit: ['5000000000000000', '202200000000000000000'],
        rewardAssetIds: [],
        isClaimableRewards: false,
      })
    })
  })
  describe('selects many opportunities', () => {
    const staking = {
      ...initialState.staking,
      byId: {
        [mockStakingContractTwo]: {
          apy: '1000',
          assetId: mockStakingContractTwo,
          name: 'FOX Farming',
          id: mockStakingContractTwo,
          provider: DefiProvider.EthFoxStaking,
          tvl: '91283233211',
          type: DefiType.LiquidityPool,
          underlyingAssetIds: foxEthPair,
          underlyingAssetId: foxEthLpAssetId,
          underlyingAssetRatiosBaseUnit: ['5000000000000000', '202200000000000000000'] as [
            string,
            string,
          ],
          rewardAssetIds: [foxAssetId] as const,
          isClaimableRewards: true,
        },
      },
      ids: [mockStakingContractTwo],
    }
    const userStaking: OpportunitiesState['userStaking'] = {
      ...initialState.staking,
      ids: [
        serializeUserStakingId(gomesAccountId, mockStakingContractTwo),
        serializeUserStakingId(catpuccinoAccountId, mockStakingContractTwo),
        serializeUserStakingId(gomesAccountId, mockStakingContractOne),
      ],
      byId: {
        [serializeUserStakingId(gomesAccountId, mockStakingContractTwo)]: {
          userStakingId: serializeUserStakingId(gomesAccountId, mockStakingContractTwo),
          stakedAmountCryptoBaseUnit: '1337',
          rewardsCryptoBaseUnit: {
            amounts: ['420000000000000000000'] as [string],
            claimable: true,
          },
        },
        [serializeUserStakingId(catpuccinoAccountId, mockStakingContractTwo)]: {
          userStakingId: serializeUserStakingId(catpuccinoAccountId, mockStakingContractTwo),
          stakedAmountCryptoBaseUnit: '100',
          rewardsCryptoBaseUnit: { amounts: ['1000000000000000000'] as [string], claimable: true },
        },
        [serializeUserStakingId(gomesAccountId, mockStakingContractOne)]: {
          userStakingId: serializeUserStakingId(gomesAccountId, mockStakingContractOne),
          stakedAmountCryptoBaseUnit: '4',
          rewardsCryptoBaseUnit: { amounts: ['3000000000000000000'] as [string], claimable: true },
        },
      },
    }

    const mockState = {
      ...mockBaseState,
      opportunities: {
        ...initialState,
        staking,
        userStaking,
      },
    }
    describe('selectUserStakingOpportunitiesByStakingId', () => {
      it('can get the staking data for a given StakingId', () => {
        const result = selectUserStakingOpportunitiesFromStakingId(mockState, {
          stakingId: mockStakingContractTwo,
        })
        expect(result).toEqual([
          {
            apy: '1000',
            assetId: mockStakingContractTwo,
            id: mockStakingContractTwo,
            name: 'FOX Farming',
            provider: DefiProvider.EthFoxStaking,
            rewardsCryptoBaseUnit: {
              amounts: ['420000000000000000000'] as [string],
              claimable: true,
            },
            stakedAmountCryptoBaseUnit: '1337',
            tvl: '91283233211',
            type: DefiType.LiquidityPool,
            underlyingAssetId: foxEthLpAssetId,
            underlyingAssetIds: foxEthPair,
            underlyingAssetRatiosBaseUnit: ['5000000000000000', '202200000000000000000'] as [
              string,
              string,
            ],
            userStakingId: serializeUserStakingId(gomesAccountId, mockStakingContractTwo),
            rewardAssetIds: [foxAssetId],
            isClaimableRewards: true,
          },
          {
            apy: '1000',
            assetId: mockStakingContractTwo,
            id: mockStakingContractTwo,
            name: 'FOX Farming',
            provider: DefiProvider.EthFoxStaking,
            rewardsCryptoBaseUnit: {
              amounts: ['1000000000000000000'] as [string],
              claimable: true,
            },
            stakedAmountCryptoBaseUnit: '100',
            tvl: '91283233211',
            type: DefiType.LiquidityPool,
            underlyingAssetId: foxEthLpAssetId,
            underlyingAssetIds: foxEthPair,
            underlyingAssetRatiosBaseUnit: ['5000000000000000', '202200000000000000000'] as [
              string,
              string,
            ],
            userStakingId: serializeUserStakingId(catpuccinoAccountId, mockStakingContractTwo),
            rewardAssetIds: [foxAssetId],
            isClaimableRewards: true,
          },
        ])
      })
    })
    describe('selectAggregatedUserStakingOpportunityByStakingId', () => {
      it('can get the aggregated staking opportunity for a given StakingId', () => {
        const result = selectAggregatedUserStakingOpportunityByStakingId(mockState, {
          stakingId: mockStakingContractTwo,
        })
        expect(result).toEqual({
          apy: '1000',
          assetId: mockStakingContractTwo,
          id: mockStakingContractTwo,
          userStakingId: 'eip155:1:0xcatpuccino*eip155:1:0xStakingContractTwo',
          name: 'FOX Farming',
          provider: DefiProvider.EthFoxStaking,
          tvl: '91283233211',
          type: DefiType.LiquidityPool,
          underlyingAssetId: foxEthLpAssetId,
          underlyingAssetIds: foxEthPair,
          underlyingAssetRatiosBaseUnit: ['5000000000000000', '202200000000000000000'] as [
            string,
            string,
          ],
          rewardsCryptoBaseUnit: {
            amounts: ['421000000000000000000'] as [string],
            claimable: true,
          },
          rewardAssetIds: [foxAssetId],
          stakedAmountCryptoBaseUnit: '1437',
          undelegations: [],
          isClaimableRewards: true,
        })
      })
    })
  })
})
