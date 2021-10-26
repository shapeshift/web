import { renderHook } from '@testing-library/react-hooks'
import { useLocation } from 'react-router-dom'

import { useQuery } from './useQuery'

jest.mock('react-router-dom', () => ({
  useLocation: jest.fn()
}))

describe('useQuery', () => {
  it('should parse the query params', () => {
    ;(useLocation as jest.Mock<unknown>).mockImplementation(() => ({
      search: '?foo=bar&chain=ethereum'
    }))
    const { result } = renderHook(() => useQuery())
    expect(result.current).toEqual({
      foo: 'bar',
      chain: 'ethereum'
    })
  })

  it('should parses query params without prefixed `?`', () => {
    ;(useLocation as jest.Mock<unknown>).mockImplementation(() => ({
      search: 'foo=bar&chain=ethereum'
    }))
    const { result } = renderHook(() => useQuery())
    expect(result.current).toEqual({
      foo: 'bar',
      chain: 'ethereum'
    })
  })
})
