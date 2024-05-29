import { describe, expect, it } from 'vitest'

import { formatSecondsToDuration } from './time'

describe('formatSecondsToDuration', () => {
  it('should format seconds correctly when less than a minute', () => {
    expect(formatSecondsToDuration(0)).toBe('0 seconds')
    expect(formatSecondsToDuration(1)).toBe('1 second')
    expect(formatSecondsToDuration(59)).toBe('59 seconds')
  })

  it('should format seconds into minutes when less than an hour', () => {
    expect(formatSecondsToDuration(60)).toBe('1 minute')
    expect(formatSecondsToDuration(3599)).toBe('59 minutes')
  })

  it('should format seconds into hours when less than a day', () => {
    expect(formatSecondsToDuration(3600)).toBe('1 hour')
    expect(formatSecondsToDuration(7200)).toBe('2 hours')
    expect(formatSecondsToDuration(86399)).toBe('23 hours')
  })

  it('should format seconds into days when less than a month', () => {
    expect(formatSecondsToDuration(86400)).toBe('1 day')
    expect(formatSecondsToDuration(172800)).toBe('2 days')
    expect(formatSecondsToDuration(2591999)).toBe('29 days')
  })

  it('should format seconds into months when more than or equal to a month', () => {
    expect(formatSecondsToDuration(2592000)).toBe('1 month')
    expect(formatSecondsToDuration(5184000)).toBe('2 months')
    expect(formatSecondsToDuration(7776000)).toBe('3 months')
  })

  it('should handle 0-value seconds correctly', () => {
    expect(formatSecondsToDuration(0)).toBe('0 seconds')
  })
})
