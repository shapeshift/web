import { describe, expect, it } from 'vitest'

import { ApiError } from '../../api/client'
import { isPermanentApiError } from '../apiError'

describe('isPermanentApiError', () => {
  it('treats a rejected request as permanent', () => {
    expect(isPermanentApiError(new ApiError(400, 'UNSUPPORTED_SELL_CHAIN', 'API error: 400'))).toBe(
      true,
    )
  })

  it('keeps retrying rate limits and timeouts', () => {
    expect(isPermanentApiError(new ApiError(429, undefined, 'API error: 429'))).toBe(false)
    expect(isPermanentApiError(new ApiError(408, undefined, 'API error: 408'))).toBe(false)
  })

  it('keeps retrying server and network failures', () => {
    expect(isPermanentApiError(new ApiError(500, undefined, 'API error: 500'))).toBe(false)
    expect(isPermanentApiError(new TypeError('Failed to fetch'))).toBe(false)
  })
})
