import {
  deepUpsertArray,
  isValidAccountNumber,
  partitionCompare,
  partitionCompareWith,
  upsertArray,
} from './utils'

describe('lib/utils', () => {
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
  describe('isValidAccountNumber', () => {
    it('should return true for 0', () => {
      const accountNumber = 0
      expect(isValidAccountNumber(accountNumber)).toBeTruthy()
    })

    it('should return true for 1', () => {
      const accountNumber = 1
      expect(isValidAccountNumber(accountNumber)).toBeTruthy()
    })

    it('should return false for undefined', () => {
      const accountNumber = undefined
      expect(isValidAccountNumber(accountNumber)).toBeFalsy()
    })

    it('should return false for null', () => {
      const accountNumber = null
      expect(isValidAccountNumber(accountNumber)).toBeFalsy()
    })

    it('should return false for negative numbers', () => {
      const accountNumber = -1
      expect(isValidAccountNumber(accountNumber)).toBeFalsy()
    })

    it('should return false for non integers', () => {
      const accountNumber = 1.1
      expect(isValidAccountNumber(accountNumber)).toBeFalsy()
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

      const add = jest.fn()
      const remove = jest.fn()

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
})
