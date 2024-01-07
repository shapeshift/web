import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useStateIfMounted } from './useStateIfMounted'

describe('useStateIfMounted hook tied to component', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  it('sets state if component is mounted', () => {
    // the intention of useStateIfMounted hook is to avoid
    // the update to state if the component is unmounted and there is
    // a pending change to the state due to an effect or asynchronous call
    const { result } = renderHook(() => useStateIfMounted(0))

    expect(result.current[0]).toBe(0)

    setTimeout(
      () =>
        act(() => {
          result.current[1](1)
        }),
      0,
    )

    expect(result.current[0]).toBe(0)

    vi.runAllTimers()

    expect(result.current[0]).toBe(1)
  })

  it('does not set state if component is unmounted', () => {
    const { result, unmount } = renderHook(() => useStateIfMounted(0))
    const [state, setState] = result.current

    expect(state).toBe(0)

    setTimeout(
      () =>
        act(() => {
          setState(1)
        }),
      0,
    )

    unmount()
    vi.runAllTimers()

    expect(state).toBe(0)
  })
})
