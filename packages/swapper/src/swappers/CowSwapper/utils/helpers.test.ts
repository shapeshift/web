import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getNowPlusThirtyMinutesTimestamp } from './helpers'

describe('getNowPlusThirtyMinutesTimestamp', () => {
  const mockDay = '2020-12-31'
  const mockTime = 'T23:59:59.000Z'
  const mockDate = `${mockDay}${mockTime}`

  beforeEach(() => {
    vi.useFakeTimers().setSystemTime(new Date(mockDate))
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('should return the timestamp corresponding to current time + 30 minutes (UTC)', () => {
    const timestamp = getNowPlusThirtyMinutesTimestamp()
    expect(timestamp).toEqual(1609460999)
    expect(new Date(timestamp * 1000).toUTCString()).toEqual('Fri, 01 Jan 2021 00:29:59 GMT')
  })
})
