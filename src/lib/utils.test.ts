import { upsertArray } from './utils'

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
