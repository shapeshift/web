import { describe, expect, it } from 'vitest'

import { formatSecondsToDuration } from './time'

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
