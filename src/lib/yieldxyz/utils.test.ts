import { describe, expect, it } from 'vitest'

import { FIGMENT_SOLANA_VALIDATOR_ADDRESS, SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS } from './constants'
import type { AugmentedYieldDto, ValidatorDto } from './types'
import {
  ensureValidatorApr,
  formatYieldTxTitle,
  getBestActionableYield,
  getDefaultValidatorForYield,
  getTransactionButtonText,
  getYieldActionLabelKeys,
  getYieldSuccessMessageKey,
  isStakingYieldType,
  resolveYieldInputAssetIcon,
  searchValidators,
  searchYields,
  sortValidators,
} from './utils'

describe('getTransactionButtonText', () => {
  it('should handle type variations with dashes and underscores', () => {
    expect(getTransactionButtonText('CLAIM_REWARDS', undefined)).toBe('Claim')
    expect(getTransactionButtonText('claim-rewards', undefined)).toBe('Claim')
  })

  it('should use vault terminology (deposit/withdraw) by default', () => {
    expect(getTransactionButtonText(undefined, 'Approve token')).toBe('Approve')
    expect(getTransactionButtonText(undefined, 'Deposit ETH transaction')).toBe('Deposit')
    expect(getTransactionButtonText(undefined, 'Claim rewards')).toBe('Claim')
    expect(getTransactionButtonText('DEPOSIT', undefined)).toBe('Deposit')
    expect(getTransactionButtonText('WITHDRAW', undefined)).toBe('Withdraw')
  })

  it('should use staking terminology when yieldType is staking', () => {
    expect(getTransactionButtonText('STAKE', undefined, 'staking')).toBe('Stake')
    expect(getTransactionButtonText('UNSTAKE', undefined, 'staking')).toBe('Unstake')
    expect(getTransactionButtonText('DEPOSIT', undefined, 'liquid-staking')).toBe('Stake')
    expect(getTransactionButtonText('WITHDRAW', undefined, 'liquid-staking')).toBe('Unstake')
    expect(getTransactionButtonText(undefined, 'Deposit ETH', 'native-staking')).toBe('Stake')
  })

  it('should return Confirm as final fallback', () => {
    expect(getTransactionButtonText(undefined, undefined)).toBe('Confirm')
    expect(getTransactionButtonText(undefined, 'Unknown action')).toBe('Confirm')
  })

  it('should capitalize unknown types', () => {
    expect(getTransactionButtonText('CUSTOM_ACTION', undefined)).toBe('Custom_action')
  })
})

describe('resolveYieldInputAssetIcon', () => {
  it('should prefer inputToken assetId', () => {
    const yieldItem = {
      inputTokens: [{ assetId: 'eip155:1/slip44:60', logoURI: 'https://input.png' }],
      token: { assetId: 'eip155:1/erc20:0xtoken', logoURI: 'https://token.png' },
      metadata: { logoURI: 'https://metadata.png' },
    }
    expect(resolveYieldInputAssetIcon(yieldItem)).toEqual({
      assetId: 'eip155:1/slip44:60',
      src: undefined,
    })
  })

  it('should fallback to token assetId when inputToken has none', () => {
    const yieldItem = {
      inputTokens: [{ logoURI: 'https://input.png' }],
      token: { assetId: 'eip155:1/erc20:0xtoken', logoURI: 'https://token.png' },
      metadata: { logoURI: 'https://metadata.png' },
    }
    expect(resolveYieldInputAssetIcon(yieldItem)).toEqual({
      assetId: 'eip155:1/erc20:0xtoken',
      src: undefined,
    })
  })

  it('should fallback to inputToken logoURI when no assetIds', () => {
    const yieldItem = {
      inputTokens: [{ logoURI: 'https://input.png' }],
      token: { logoURI: 'https://token.png' },
      metadata: { logoURI: 'https://metadata.png' },
    }
    expect(resolveYieldInputAssetIcon(yieldItem)).toEqual({
      assetId: undefined,
      src: 'https://input.png',
    })
  })

  it('should fallback to metadata logoURI as last resort', () => {
    const yieldItem = {
      inputTokens: [],
      token: {},
      metadata: { logoURI: 'https://metadata.png' },
    }
    expect(resolveYieldInputAssetIcon(yieldItem)).toEqual({
      assetId: undefined,
      src: 'https://metadata.png',
    })
  })

  it('should handle empty inputTokens array', () => {
    const yieldItem = {
      inputTokens: [],
      token: { assetId: 'eip155:1/slip44:60' },
      metadata: {},
    }
    expect(resolveYieldInputAssetIcon(yieldItem)).toEqual({
      assetId: 'eip155:1/slip44:60',
      src: undefined,
    })
  })
})

describe('searchYields', () => {
  const mockYields = [
    {
      metadata: { name: 'ETH Staking' },
      token: { symbol: 'ETH', name: 'Ethereum' },
      providerId: 'lido',
    },
    {
      metadata: { name: 'USDC Lending' },
      token: { symbol: 'USDC', name: 'USD Coin' },
      providerId: 'aave',
    },
    {
      metadata: { name: 'BTC Vault' },
      token: { symbol: 'WBTC', name: 'Wrapped Bitcoin' },
      providerId: 'yearn',
    },
  ] as AugmentedYieldDto[]

  it('should return all yields when query is empty', () => {
    expect(searchYields(mockYields, '')).toHaveLength(3)
  })

  it('should search by metadata name', () => {
    expect(searchYields(mockYields, 'staking')).toHaveLength(1)
    expect(searchYields(mockYields, 'staking')[0].metadata.name).toBe('ETH Staking')
  })

  it('should search by token symbol', () => {
    expect(searchYields(mockYields, 'eth')).toHaveLength(1)
    expect(searchYields(mockYields, 'usdc')).toHaveLength(1)
  })

  it('should search by token name', () => {
    expect(searchYields(mockYields, 'ethereum')).toHaveLength(1)
    expect(searchYields(mockYields, 'bitcoin')).toHaveLength(1)
  })

  it('should search by providerId', () => {
    expect(searchYields(mockYields, 'lido')).toHaveLength(1)
    expect(searchYields(mockYields, 'aave')).toHaveLength(1)
  })

  it('should be case insensitive', () => {
    expect(searchYields(mockYields, 'ETH')).toHaveLength(1)
    expect(searchYields(mockYields, 'LIDO')).toHaveLength(1)
  })

  it('should return empty array when no matches', () => {
    expect(searchYields(mockYields, 'xyz')).toHaveLength(0)
  })
})

describe('searchValidators', () => {
  const mockValidators = [
    { name: 'ShapeShift DAO', address: 'cosmos123' },
    { name: 'Figment', address: 'cosmos456' },
    { name: 'Chorus One', address: 'cosmos789' },
  ] as ValidatorDto[]

  it('should return all validators when query is empty', () => {
    expect(searchValidators(mockValidators, '')).toHaveLength(3)
  })

  it('should search by name', () => {
    expect(searchValidators(mockValidators, 'shape')).toHaveLength(1)
    expect(searchValidators(mockValidators, 'figment')).toHaveLength(1)
  })

  it('should search by address', () => {
    expect(searchValidators(mockValidators, '123')).toHaveLength(1)
    expect(searchValidators(mockValidators, 'cosmos')).toHaveLength(3)
  })

  it('should be case insensitive', () => {
    expect(searchValidators(mockValidators, 'SHAPESHIFT')).toHaveLength(1)
  })
})

describe('sortValidators', () => {
  const mockValidators = [
    { name: 'Regular', address: 'cosmos111', preferred: false },
    { name: 'ShapeShift', address: SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS, preferred: false },
    { name: 'Preferred', address: 'cosmos333', preferred: true },
  ] as ValidatorDto[]

  it('should put ShapeShift validator first by default', () => {
    const sorted = sortValidators(mockValidators)
    expect(sorted[0].name).toBe('ShapeShift')
  })

  it('should put preferred validators before non-preferred', () => {
    const sorted = sortValidators(mockValidators, { shapeShiftFirst: false, preferredFirst: true })
    expect(sorted[0].name).toBe('Preferred')
  })

  it('should respect both options', () => {
    const sorted = sortValidators(mockValidators, { shapeShiftFirst: true, preferredFirst: true })
    expect(sorted[0].name).toBe('ShapeShift')
    expect(sorted[1].name).toBe('Preferred')
  })

  it('should not mutate original array', () => {
    const original = [...mockValidators]
    sortValidators(mockValidators)
    expect(mockValidators).toEqual(original)
  })
})

describe('ensureValidatorApr', () => {
  const baseValidator = {
    name: 'Test',
    address: 'cosmos123',
    preferred: false,
    logoURI: '',
    commission: 0.05,
    status: 'active',
    stakedBalance: '1000',
    votingPower: 0.01,
    website: '',
    tvl: '1000000',
    tvlRaw: '1000000000000',
  } as unknown as ValidatorDto

  it('should return validator unchanged if it has rewardRate.total', () => {
    const validator: ValidatorDto = {
      ...baseValidator,
      rewardRate: { total: 0.15, rateType: 'APR' as const, components: [] },
    }
    expect(ensureValidatorApr(validator)).toBe(validator)
  })

  it('should add fallback APR if rewardRate.total is missing', () => {
    const validator = { ...baseValidator, rewardRate: undefined } as unknown as ValidatorDto
    const result = ensureValidatorApr(validator)
    expect(result.rewardRate?.total).toBeDefined()
    expect(result.rewardRate?.rateType).toBe('APR')
  })

  it('should preserve existing components when adding fallback', () => {
    const validator = {
      ...baseValidator,
      rewardRate: { components: [{ type: 'test', rate: 0.1 }] },
    } as unknown as ValidatorDto
    const result = ensureValidatorApr(validator)
    expect(result.rewardRate?.components).toHaveLength(1)
  })
})

describe('getYieldActionLabelKeys', () => {
  it('should return stake/unstake for staking yield types', () => {
    expect(getYieldActionLabelKeys('staking')).toEqual({
      enter: 'defi.stake',
      exit: 'defi.unstake',
    })
    expect(getYieldActionLabelKeys('native-staking')).toEqual({
      enter: 'defi.stake',
      exit: 'defi.unstake',
    })
    expect(getYieldActionLabelKeys('pooled-staking')).toEqual({
      enter: 'defi.stake',
      exit: 'defi.unstake',
    })
    expect(getYieldActionLabelKeys('liquid-staking')).toEqual({
      enter: 'defi.stake',
      exit: 'defi.unstake',
    })
  })

  it('should return stake/unstake for restaking yield types', () => {
    expect(getYieldActionLabelKeys('restaking')).toEqual({
      enter: 'defi.stake',
      exit: 'defi.unstake',
    })
  })

  it('should return deposit/withdraw for vault yield types', () => {
    expect(getYieldActionLabelKeys('vault')).toEqual({
      enter: 'common.deposit',
      exit: 'common.withdraw',
    })
  })

  it('should return deposit/withdraw for lending yield types', () => {
    expect(getYieldActionLabelKeys('lending')).toEqual({
      enter: 'common.deposit',
      exit: 'common.withdraw',
    })
  })
})

describe('isStakingYieldType', () => {
  it('should return true for staking-related yield types', () => {
    expect(isStakingYieldType('staking')).toBe(true)
    expect(isStakingYieldType('native-staking')).toBe(true)
    expect(isStakingYieldType('pooled-staking')).toBe(true)
    expect(isStakingYieldType('liquid-staking')).toBe(true)
    expect(isStakingYieldType('restaking')).toBe(true)
  })

  it('should return false for non-staking yield types', () => {
    expect(isStakingYieldType('vault')).toBe(false)
    expect(isStakingYieldType('lending')).toBe(false)
  })
})

describe('formatYieldTxTitle', () => {
  it('should use vault terminology by default', () => {
    expect(formatYieldTxTitle('Deposit ETH', 'ETH')).toBe('Deposit ETH')
    expect(formatYieldTxTitle('Withdraw ETH transaction', 'ETH')).toBe('Withdraw ETH')
    expect(formatYieldTxTitle('Approve ETH', 'ETH')).toBe('Approve ETH')
  })

  it('should use staking terminology when yieldType is staking', () => {
    expect(formatYieldTxTitle('Deposit ETH', 'ETH', 'staking')).toBe('Stake ETH')
    expect(formatYieldTxTitle('Withdraw ETH', 'ETH', 'liquid-staking')).toBe('Unstake ETH')
    expect(formatYieldTxTitle('Exit ETH', 'ETH', 'native-staking')).toBe('Unstake ETH')
    expect(formatYieldTxTitle('Unstake ETH', 'ETH', 'pooled-staking')).toBe('Unstake ETH')
  })

  it('should preserve unknown titles', () => {
    expect(formatYieldTxTitle('Custom action', 'ETH')).toBe('Custom action')
    expect(formatYieldTxTitle('Custom action', 'ETH', 'staking')).toBe('Custom action')
  })
})

describe('getYieldSuccessMessageKey', () => {
  it('should return staking success keys for staking yield types', () => {
    expect(getYieldSuccessMessageKey('staking', 'enter')).toBe('successStaked')
    expect(getYieldSuccessMessageKey('staking', 'exit')).toBe('successUnstaked')
    expect(getYieldSuccessMessageKey('native-staking', 'enter')).toBe('successStaked')
    expect(getYieldSuccessMessageKey('liquid-staking', 'exit')).toBe('successUnstaked')
    expect(getYieldSuccessMessageKey('pooled-staking', 'enter')).toBe('successStaked')
  })

  it('should return staking success key for restaking yield types', () => {
    expect(getYieldSuccessMessageKey('restaking', 'enter')).toBe('successStaked')
    expect(getYieldSuccessMessageKey('restaking', 'exit')).toBe('successUnstaked')
  })

  it('should return vault success keys for vault/lending yield types', () => {
    expect(getYieldSuccessMessageKey('vault', 'enter')).toBe('successDeposited')
    expect(getYieldSuccessMessageKey('vault', 'exit')).toBe('successWithdrawn')
    expect(getYieldSuccessMessageKey('lending', 'enter')).toBe('successDeposited')
    expect(getYieldSuccessMessageKey('lending', 'exit')).toBe('successWithdrawn')
  })

  it('should return successClaim for claim and manage actions', () => {
    expect(getYieldSuccessMessageKey('staking', 'claim')).toBe('successClaim')
    expect(getYieldSuccessMessageKey('vault', 'claim')).toBe('successClaim')
    expect(getYieldSuccessMessageKey('staking', 'manage')).toBe('successClaim')
    expect(getYieldSuccessMessageKey('vault', 'manage')).toBe('successClaim')
  })
})

describe('getDefaultValidatorForYield', () => {
  it('should return ShapeShift DAO validator for cosmos-atom-native-staking', () => {
    expect(getDefaultValidatorForYield('cosmos-atom-native-staking')).toBe(
      SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS,
    )
  })

  it('should return Figment validator for solana-sol-native-multivalidator-staking', () => {
    expect(getDefaultValidatorForYield('solana-sol-native-multivalidator-staking')).toBe(
      FIGMENT_SOLANA_VALIDATOR_ADDRESS,
    )
  })

  it('should return undefined for yields without enforced validators', () => {
    expect(getDefaultValidatorForYield('ethereum-eth-lido-staking')).toBeUndefined()
    expect(getDefaultValidatorForYield('solana-sol-lido-staking')).toBeUndefined()
    expect(getDefaultValidatorForYield('some-random-yield')).toBeUndefined()
  })
})

describe('getBestActionableYield', () => {
  const createMockYield = (
    id: string,
    apy: number,
    options: { enterDisabled?: boolean; underMaintenance?: boolean; deprecated?: boolean } = {},
  ): AugmentedYieldDto =>
    ({
      id,
      rewardRate: { total: apy, rateType: 'APY', components: [] },
      status: { enter: !options.enterDisabled, exit: true },
      metadata: {
        name: `Yield ${id}`,
        underMaintenance: options.underMaintenance ?? false,
        deprecated: options.deprecated ?? false,
      },
    }) as unknown as AugmentedYieldDto

  it('should return undefined for empty array', () => {
    expect(getBestActionableYield([])).toBeUndefined()
  })

  it('should return undefined when all yields are disabled', () => {
    const yields = [
      createMockYield('a', 0.1, { enterDisabled: true }),
      createMockYield('b', 0.2, { underMaintenance: true }),
      createMockYield('c', 0.3, { deprecated: true }),
    ]
    expect(getBestActionableYield(yields)).toBeUndefined()
  })

  it('should return highest APY yield when multiple are actionable', () => {
    const yields = [
      createMockYield('low', 0.05),
      createMockYield('high', 0.15),
      createMockYield('mid', 0.1),
    ]
    const result = getBestActionableYield(yields)
    expect(result?.id).toBe('high')
  })

  it('should filter out yields with enter disabled', () => {
    const yields = [
      createMockYield('disabled-high', 0.2, { enterDisabled: true }),
      createMockYield('enabled-low', 0.05),
    ]
    const result = getBestActionableYield(yields)
    expect(result?.id).toBe('enabled-low')
  })

  it('should filter out yields under maintenance', () => {
    const yields = [
      createMockYield('maintenance-high', 0.2, { underMaintenance: true }),
      createMockYield('active-low', 0.05),
    ]
    const result = getBestActionableYield(yields)
    expect(result?.id).toBe('active-low')
  })

  it('should filter out deprecated yields', () => {
    const yields = [
      createMockYield('deprecated-high', 0.2, { deprecated: true }),
      createMockYield('active-low', 0.05),
    ]
    const result = getBestActionableYield(yields)
    expect(result?.id).toBe('active-low')
  })

  it('should return the only actionable yield', () => {
    const yields = [
      createMockYield('disabled', 0.3, { enterDisabled: true }),
      createMockYield('only-active', 0.1),
      createMockYield('maintenance', 0.25, { underMaintenance: true }),
    ]
    const result = getBestActionableYield(yields)
    expect(result?.id).toBe('only-active')
  })
})
