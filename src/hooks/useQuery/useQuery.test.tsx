import { renderHook } from '@testing-library/react'
import type { Location } from 'history'
import { useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { useQuery } from './useQuery'

vi.mock('react-router-dom', () => ({
  useLocation: vi.fn(),
}))

describe('useQuery', () => {
  it('should parse the query params', () => {
    vi.mocked(useLocation).mockImplementation(
      () =>
        ({
          search: '?foo=bar&chain=ethereum',
        }) as Location,
    )
    const { result } = renderHook(() => useQuery())
    expect(result.current).toEqual({
      foo: 'bar',
      chain: 'ethereum',
    })
  })

  it('should parses query params without prefixed `?`', () => {
    vi.mocked(useLocation).mockImplementation(
      () =>
        ({
          search: 'foo=bar&chain=ethereum',
        }) as Location,
    )
    const { result } = renderHook(() => useQuery())
    expect(result.current).toEqual({
      foo: 'bar',
      chain: 'ethereum',
    })
  })
})
