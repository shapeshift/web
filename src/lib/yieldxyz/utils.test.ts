import { describe, expect, it } from 'vitest'

import { SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS } from './constants'
import type { AugmentedYieldDto, ValidatorDto } from './types'
import {
  ensureValidatorApr,
  getTransactionButtonText,
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

  it('should fallback to parsing title when type is unknown', () => {
    expect(getTransactionButtonText(undefined, 'Approve token')).toBe('Approve')
    expect(getTransactionButtonText(undefined, 'Deposit ETH transaction')).toBe('Enter')
    expect(getTransactionButtonText(undefined, 'Claim rewards')).toBe('Claim')
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
