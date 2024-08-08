import type { ChainId } from '@shapeshiftoss/caip'
import {
  cosmosAssetId,
  cosmosChainId,
  ethAssetId,
  ethChainId,
  foxAssetId,
  foxyAssetId,
  fromAssetId,
} from '@shapeshiftoss/caip'
import { describe, expect, it, test, vi } from 'vitest'
import { fauxmesAccountId } from 'state/slices/opportunitiesSlice/mocks'
import type {
  LpId,
  OpportunityId,
  StakingId,
  ValidatorId,
} from 'state/slices/opportunitiesSlice/types'
import { opportunityIdToChainId } from 'state/slices/opportunitiesSlice/utils'

import {
  assertIsDefined,
  contractAddressOrUndefined,
  deepUpsertArray,
  hashCode,
  isFulfilled,
  isNonEmpty,
  isRejected,
  isSome,
  isToken,
  isUrl,
  partitionCompare,
  partitionCompareWith,
  sha256,
  upsertArray,
} from '.'

describe('lib/utils', () => {
  describe('opportunityIdToChainId', () => {
    test('returns the correct chain ID for an LpId', () => {
      const lpId: LpId = foxAssetId as LpId
      const result: ChainId = opportunityIdToChainId(lpId)
      expect(result).toEqual(ethChainId)
    })

    test('returns the correct chain ID for a StakingId', () => {
      const stakingId: StakingId = foxyAssetId as StakingId
      const result: ChainId = opportunityIdToChainId(stakingId)
      expect(result).toEqual(ethChainId)
    })

    test('returns the correct chain ID for a ValidatorId', () => {
      const validatorId: ValidatorId = fauxmesAccountId as ValidatorId
      const result: ChainId = opportunityIdToChainId(validatorId)
      expect(result).toEqual(ethChainId)
    })

    test('returns the correct chain ID for a Cosmos asset ID', () => {
      const cosmosOpportunityId: OpportunityId = cosmosAssetId as OpportunityId
      const result: ChainId = opportunityIdToChainId(cosmosOpportunityId)
      expect(result).toEqual(cosmosChainId)
    })
  })

  describe('deepUpsertArray', () => {
    const l1Key = 'l1Key'
    const l2Key = 'l2Key'
    it('should add value that does not exist', () => {
      const original = {
        [l1Key]: {
          [l2Key]: ['foo'],
        },
      }
      const updated = {
        [l1Key]: {
          [l2Key]: ['foo', 'bar'],
        },
      }
      const value = 'bar'
      deepUpsertArray(original, l1Key, l2Key, value)
      expect(original).toEqual(updated)
    })

    it('should not duplicate value that does exist', () => {
      const original = {
        [l1Key]: {
          [l2Key]: ['foo'],
        },
      }
      const updated = {
        [l1Key]: {
          [l2Key]: ['foo'],
        },
      }
      const value = 'foo'
      deepUpsertArray(original, l1Key, l2Key, value)
      expect(original).toEqual(updated)
    })

    it('should deeply add value for empty root object', () => {
      const original = {}
      const updated = {
        [l1Key]: {
          [l2Key]: ['foo'],
        },
      }
      const value = 'foo'
      deepUpsertArray(original, l1Key, l2Key, value)
      expect(original).toEqual(updated)
    })
  })

  describe('partitionCompare', () => {
    it('should remove from first and keep from second', () => {
      const first = [1, 2]
      const second = [2, 3]

      expect(partitionCompare(first, second)).toStrictEqual({ remove: [1], keep: [2], add: [3] })
    })

    it('should remove from first and keep from second 2', () => {
      const first = [1, 3]
      const second = [1, 2]

      expect(partitionCompare(first, second)).toStrictEqual({ remove: [3], keep: [1], add: [2] })
    })

    it('should only add from second', () => {
      const first = [1, 2]
      const second = [1, 2, 3]

      expect(partitionCompare(first, second)).toStrictEqual({ remove: [], keep: [1, 2], add: [3] })
    })

    it('should only remove from first', () => {
      const first = [1, 2, 3]
      const second = [1, 2]

      expect(partitionCompare(first, second)).toStrictEqual({ remove: [3], keep: [1, 2], add: [] })
    })

    it('should only remove', () => {
      const first = [1, 2, 3]
      const second: number[] = []

      expect(partitionCompare(first, second)).toStrictEqual({
        remove: [1, 2, 3],
        keep: [],
        add: [],
      })
    })

    it('should only add', () => {
      const first: number[] = []
      const second = [1, 2]

      expect(partitionCompare(first, second)).toStrictEqual({ remove: [], keep: [], add: [1, 2] })
    })
  })

  describe('partitionCompareWith', () => {
    it('should remove from first and keep from second', () => {
      const first = [1, 2, 3]
      const second = [3, 4, 5]

      const add = vi.fn()
      const remove = vi.fn()

      expect(partitionCompareWith(first, second, { add, remove })).toStrictEqual({
        remove: [1, 2],
        keep: [3],
        add: [4, 5],
      })
      expect(add).toHaveBeenNthCalledWith(1, 4)
      expect(add).toHaveBeenNthCalledWith(2, 5)
      expect(remove).toHaveBeenNthCalledWith(1, 1)
      expect(remove).toHaveBeenNthCalledWith(2, 2)
    })
  })

  describe('upsertArray', () => {
    it('does not insert duplicate', () => {
      const arr = [1, 2]
      const item = 2
      const result = upsertArray(arr, item)
      expect(result).toEqual(arr)
    })

    it('does insert new unique item', () => {
      const arr = [1, 2]
      const item = 3
      const result = upsertArray(arr, item)
      const expected = [1, 2, 3]
      expect(result).toEqual(expected)
    })
  })

  describe('hashCode', () => {
    it('is deterministic', () => {
      const str = fauxmesAccountId
      const result = hashCode(str)
      const expected = hashCode(str)
      expect(result).toEqual(expected)
    })
  })

  describe('isToken', () => {
    it('should return false for non-token', () => {
      expect(isToken(ethAssetId)).toBe(false)
    })
    it('should return true for token', () => {
      expect(isToken(foxAssetId)).toBe(true)
    })
  })
  describe('contractAddressOrUndefined', () => {
    it('should return contract address for token', () => {
      const { assetReference } = fromAssetId(foxAssetId)
      expect(contractAddressOrUndefined(foxAssetId)).toBe(assetReference)
    })
  })

  describe('isSome', () => {
    it('should return true for some', () => {
      expect(isSome(1)).toBe(true)
    })
    it('should return false for none', () => {
      expect(isSome(null)).toBe(false)
      expect(isSome(undefined)).toBe(false)
    })
  })

  describe('isFulfilled', () => {
    const fulfilledResult = Promise.resolve('fulfilled')
    const createRejectedPromise = () => Promise.reject('rejected')

    it('should return true for fulfilled', async () => {
      const results = await Promise.allSettled([
        fulfilledResult,
        createRejectedPromise().catch(e => e),
      ])
      expect(isFulfilled(results[0])).toBe(true)
    })

    it('should return false for rejected', async () => {
      await expect(createRejectedPromise()).rejects.toThrowError('rejected')
    })
  })

  describe('isRejected', () => {
    it('correctly identifies rejected promises', async () => {
      const fulfilledResult = Promise.resolve('fulfilled')
      const rejectedResult = Promise.reject('rejected')

      const results = await Promise.allSettled([fulfilledResult, rejectedResult])

      expect(isRejected(results[0])).toBe(false)
      expect(isRejected(results[1])).toBe(true)
    })
  })

  describe('sha256', () => {
    it('returns the correct sha256 hash for a given input', () => {
      const input = 'Hello, World!'
      const expectedHash = 'dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f'

      expect(sha256(input)).toEqual(expectedHash)
    })

    it('returns a different hash for an incorrect input', () => {
      const input = 'Hello, World!'
      const incorrectInput = 'Goodbye, World!'
      const incorrectHash = sha256(incorrectInput)

      expect(sha256(input)).not.toEqual(incorrectHash)
    })
  })

  describe('assertIsDefined', () => {
    it('should not throw an error for defined values', () => {
      const definedValue = 'Hello, World!'

      expect(() => {
        assertIsDefined(definedValue)
      }).not.toThrow()
    })

    it('should throw an error for undefined values', () => {
      const undefinedValue = undefined

      expect(() => {
        assertIsDefined(undefinedValue)
      }).toThrow('unexpected undefined or null')
    })

    it('should throw an error for null values', () => {
      const nullValue = null

      expect(() => {
        assertIsDefined(nullValue)
      }).toThrow('unexpected undefined or null')
    })
  })
  describe('isNonEmpty', () => {
    it('returns true for non-empty strings', () => {
      const input = 'Hello, World!'
      expect(isNonEmpty(input)).toBe(true)
    })

    it('returns false for empty strings', () => {
      const input = ''
      expect(isNonEmpty(input)).toBe(false)
    })

    it('returns true for non-empty arrays', () => {
      const input = [1, 2, 3]
      expect(isNonEmpty(input)).toBe(true)
    })

    it('returns false for empty arrays', () => {
      const input: any[] = []
      expect(isNonEmpty(input)).toBe(false)
    })

    it('returns true for non-empty sets', () => {
      const input = new Set([1, 2, 3])
      expect(isNonEmpty(input)).toBe(true)
    })

    it('returns false for empty sets', () => {
      const input = new Set()
      expect(isNonEmpty(input)).toBe(false)
    })
  })

  describe('isUrl', () => {
    it('returns true for valid URLs', () => {
      const validUrl = 'https://www.example.com'
      expect(isUrl(validUrl)).toBe(true)
    })

    it('returns false for invalid URLs', () => {
      const invalidUrl = 'invalid_url'
      expect(isUrl(invalidUrl)).toBe(false)
    })

    it('returns true for URLs with special characters', () => {
      const specialCharsUrl = 'https://www.example.com/path?query=string#fragment'
      expect(isUrl(specialCharsUrl)).toBe(true)
    })

    it('returns false for URLs without a protocol', () => {
      const noProtocolUrl = 'www.example.com'
      expect(isUrl(noProtocolUrl)).toBe(false)
    })
  })
})
