import { act, renderHook } from '@testing-library/react-hooks'

import { useStateToggle } from './useStateToggle'

describe('useStateToggle', () => {
  it('toggles state', () => {
    const { result } = renderHook(() => useStateToggle())

    expect(result.current[0]).toBe(false)

    act(() => result.current[1]())

    expect(result.current[0]).toBe(true)

    act(() => result.current[1]())

    expect(result.current[0]).toBe(false)
  })
})
