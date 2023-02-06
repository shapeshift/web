import { renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { TestProviders } from 'test/TestProviders'
import type {
  LpEarnOpportunityType,
  StakingEarnOpportunityType,
} from 'state/slices/opportunitiesSlice/types'

import type { NormalizeOpportunitiesProps } from './normalizeOpportunity'
import { useNormalizeOpportunities } from './normalizeOpportunity'

jest.mock('@shapeshiftoss/investor-yearn')
jest.mock('pages/Defi/hooks/useFoxyBalances')

const mockStakingOpportunities = [
  {
    contractAddress: '0x3fe7940616e5bc47b0775a0dccf6237893353bb4',
    assetId: 'eip155:1/erc20:0x3fe7940616e5bc47b0775a0dccf6237893353bb4',
    id: 'eip155:1/erc20:0x3fe7940616e5bc47b0775a0dccf6237893353bb4',
    provider: 'idle',
    type: 'staking',
    underlyingAssetId: 'eip155:1/erc20:0x3fe7940616e5bc47b0775a0dccf6237893353bb4',
    underlyingAssetIds: ['eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f'],
    rewardAssetIds: [
      'eip155:1/erc20:0xc00e94cb662c3520282e6f5717214004a7f26888',
      'eip155:1/erc20:0x4da27a545c0c5b758a6ba100e3a049001de870f5',
      'eip155:1/erc20:0x875773784af8135ea0ef43b5a374aad105c5d39e',
    ],
    underlyingAssetRatiosBaseUnit: ['1000000000000000000'],
    name: 'DAI Vault',
    tags: ['Best Yield'],
    apy: '0.0216539429',
    tvl: '11029517.27155224',
    version: 'Best Yield',
    stakedAmountCryptoBaseUnit: '0',
    rewardsAmountsCryptoBaseUnit: [],
    undelegations: [],
    chainId: 'eip155:1',
    cryptoAmountPrecision: '0',
    cryptoAmountBaseUnit: '0',
    fiatAmount: '0',
    isLoaded: true,
    icons: [
      'https://rawcdn.githack.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png',
    ],
    opportunityName: 'DAI Vault',
  },
  {
    contractAddress: 'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf',
    id: 'cosmos:cosmoshub-4:cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf',
    apy: '0.1923703308',
    tvl: '18111387.072358',
    name: 'ShapeShift DAO',
    type: 'staking',
    provider: 'Cosmos',
    assetId: 'cosmos:cosmoshub-4/slip44:118',
    underlyingAssetId: 'cosmos:cosmoshub-4/slip44:118',
    underlyingAssetIds: ['cosmos:cosmoshub-4/slip44:118'],
    underlyingAssetRatiosBaseUnit: ['1000000'],
    stakedAmountCryptoBaseUnit: '327529',
    rewardsAmountsCryptoBaseUnit: ['101.984204375848955033'],
    undelegations: [
      {
        undelegationAmountCryptoBaseUnit: '115377',
        completionTime: 1677250771,
      },
      {
        undelegationAmountCryptoBaseUnit: '86533',
        completionTime: 1677251148,
      },
    ],
    chainId: 'cosmos:cosmoshub-4',
    cryptoAmountPrecision: '0.327529',
    cryptoAmountBaseUnit: '327529',
    fiatAmount: '4.7491705',
    isLoaded: true,
    icons: ['https://assets.coincap.io/assets/icons/256/atom.png'],
    opportunityName: 'ShapeShift DAO',
    rewardAddress: '',
  },
  {
    apy: '0.07884923130674588',
    assetId: 'bip122:00000000001a91e3dace36e2be3bf030/slip44:3',
    id: 'bip122:00000000001a91e3dace36e2be3bf030/slip44:3',
    provider: 'THORChain Savers',
    tvl: '208398.03859203277176',
    type: 'staking',
    underlyingAssetId: 'bip122:00000000001a91e3dace36e2be3bf030/slip44:3',
    underlyingAssetIds: ['bip122:00000000001a91e3dace36e2be3bf030/slip44:3'],
    rewardAssetIds: ['bip122:00000000001a91e3dace36e2be3bf030/slip44:3'],
    underlyingAssetRatiosBaseUnit: ['100000000'],
    name: 'DOGE Vault',
    saversMaxSupplyFiat: '837390.43874829828352',
    isFull: false,
    stakedAmountCryptoBaseUnit: '8502227396',
    rewardsAmountsCryptoBaseUnit: ['19964399'],
    chainId: 'bip122:00000000001a91e3dace36e2be3bf030',
    cryptoAmountPrecision: '85.02227396',
    cryptoAmountBaseUnit: '8502227396',
    fiatAmount: '7.81286679873232',
    isLoaded: true,
    icons: ['https://assets.coincap.io/assets/icons/256/doge.png'],
    opportunityName: 'DOGE Vault',
    rewardAddress: '',
  },
] as StakingEarnOpportunityType[]

const mockLpOpportunities = [
  {
    apy: '0.003948',
    assetId: 'eip155:1/erc20:0x470e8de2ebaef52014a47cb5e6af86884947f08c',
    id: 'eip155:1/erc20:0x470e8de2ebaef52014a47cb5e6af86884947f08c',
    provider: 'ShapeShift Farming',
    tvl: '4437320.40165431781035869548',
    type: 'lp',
    underlyingAssetId: 'eip155:1/erc20:0x470e8de2ebaef52014a47cb5e6af86884947f08c',
    underlyingAssetIds: [
      'eip155:1/slip44:60',
      'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
    ],
    underlyingAssetRatiosBaseUnit: ['5468931761814600', '238702852045389452166'],
    name: 'ETH/FOX Pool',
    isLoaded: true,
    chainId: 'eip155:1',
    underlyingToken0AmountCryptoBaseUnit: '1800763170117252.288596',
    underlyingToken1AmountCryptoBaseUnit: '78598037658210046915.861819',
    cryptoAmountPrecision: '0.329271464436732392',
    cryptoAmountBaseUnit: '329271464436732392',
    fiatAmount: '5.91575912067898973641',
    icons: [
      'https://assets.coincap.io/assets/icons/256/eth.png',
      'https://assets.coincap.io/assets/icons/256/fox.png',
    ],
    opportunityName: 'ETH/FOX Pool',
    rewardAddress: '',
  },
] as LpEarnOpportunityType[]

const mockOpportunities = {
  stakingOpportunities: mockStakingOpportunities,
  lpOpportunities: mockLpOpportunities,
}
function setup(opportunities: NormalizeOpportunitiesProps = {}) {
  const wrapper: React.FC<PropsWithChildren> = ({ children }) => (
    <TestProviders>{children}</TestProviders>
  )
  const { result } = renderHook(() => useNormalizeOpportunities(opportunities), { wrapper })
  return { result }
}

describe('useNormalizeOpportunities', () => {
  it('returns empty arrays when provided with empty arrays', () => {
    const { result } = setup()
    expect(result.current).toEqual([])
  })

  it('returns transformed array of active opportunities sorted by cryptoAmount when there are active staking opportunities', () => {
    const { result } = setup(mockOpportunities)
    expect(result.current).toMatchSnapshot()
  })

  it('returns transformed array of staking opportunities when there is no active staking opportunity', () => {
    const { result } = setup({ stakingOpportunities: [], lpOpportunities: [] })
    expect(result.current).toMatchSnapshot()
  })
})
