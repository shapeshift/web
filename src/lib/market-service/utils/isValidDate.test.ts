import { describe, expect, it } from 'vitest'

import { isValidDate } from './isValidDate'

describe('isValidDate', () => {
  it('returns true for valid date string', () => {
    expect(isValidDate('2024-01-15')).toBe(true)
  })

  it('returns true for ISO date string', () => {
    expect(isValidDate('2024-01-15T10:30:00Z')).toBe(true)
  })

  it('returns true for timestamp number', () => {
    expect(isValidDate(1705334400000)).toBe(true)
  })

  it('returns true for Date object', () => {
    expect(isValidDate(new Date())).toBe(true)
  })

  it('returns false for invalid date string', () => {
    expect(isValidDate('not-a-date')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isValidDate('')).toBe(false)
  })

  it('returns true for unix epoch', () => {
    expect(isValidDate(0)).toBe(true)
  })
})
