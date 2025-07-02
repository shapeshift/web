import { describe, expect, it } from 'vitest'

import { formatSecondsToDuration, formatSmartDate } from './time'

describe('formatSecondsToDuration', () => {
  it('should format seconds correctly when less than a minute', () => {
    expect(formatSecondsToDuration(0)).toBe('a few seconds')
    expect(formatSecondsToDuration(1)).toBe('a few seconds')
    expect(formatSecondsToDuration(59)).toBe('a minute')
  })

  it('should format seconds into minutes when less than an hour', () => {
    expect(formatSecondsToDuration(60)).toBe('a minute')
    expect(formatSecondsToDuration(3599)).toBe('an hour')
  })

  it('should format seconds into hours when less than a day', () => {
    expect(formatSecondsToDuration(3600)).toBe('an hour')
    expect(formatSecondsToDuration(7200)).toBe('2 hours')
    expect(formatSecondsToDuration(86399)).toBe('a day')
  })

  it('should format seconds into days when less than a month', () => {
    expect(formatSecondsToDuration(86400)).toBe('a day')
    expect(formatSecondsToDuration(172800)).toBe('2 days')
    expect(formatSecondsToDuration(2591999)).toBe('a month')
  })

  it('should format seconds into months when more than or equal to a month', () => {
    expect(formatSecondsToDuration(2592000)).toBe('a month')
    expect(formatSecondsToDuration(5184000)).toBe('2 months')
    expect(formatSecondsToDuration(7776000)).toBe('3 months')
  })

  it('should handle 0-value seconds correctly', () => {
    expect(formatSecondsToDuration(0)).toBe('a few seconds')
  })
})

describe('formatSmartDate', () => {
  const now = new Date()

  it('should format recent dates with relative time (within 7 days)', () => {
    // 2 hours ago
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)
    const result = formatSmartDate(twoHoursAgo)
    expect(result).toMatch(/hours? ago/)
  })

  it('should format older dates with absolute time (more than 7 days)', () => {
    // 10 days ago
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)
    const result = formatSmartDate(tenDaysAgo)
    expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/)
  })

  it('should handle string dates', () => {
    const dateString = '2023-01-01T12:00:00Z'
    const result = formatSmartDate(dateString)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('should handle number timestamps', () => {
    const timestamp = Date.now() - 60 * 60 * 1000 // 1 hour ago
    const result = formatSmartDate(timestamp)
    expect(result).toMatch(/hour ago/)
  })
})
