import { renderHook } from '@testing-library/react-hooks'

import { useIsComponentMounted } from './useIsComponentMounted'

describe('useIsComponentMounted hook', () => {
  it('should be true on render', () => {
    const { result } = renderHook(() => useIsComponentMounted())
    expect(result.current.current).toBe(true)
  })

  it('should false on unmount', () => {
    const { result, unmount } = renderHook(() => useIsComponentMounted())
    unmount()
    expect(result.current.current).toBe(false)
  })
})
