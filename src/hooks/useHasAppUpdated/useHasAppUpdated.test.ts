import { renderHook } from '@testing-library/react-hooks'

import { useHasAppUpdated } from './useHasAppUpdated'

describe('useHasAppUpdated', () => {
  it('should return false before first interval is ran', () => {
    const { result } = renderHook(() => useHasAppUpdated())
    expect(result.current).toBe(false)
  })
})
