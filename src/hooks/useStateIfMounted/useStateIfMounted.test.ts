import { act, renderHook } from '@testing-library/react-hooks'

import { useStateIfMounted } from './useStateIfMounted'

describe('useStateIfMounted hook tied to component', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.clearAllTimers()
  })

  it('sets state if component is mounted', async () => {
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
      5000
    )

    expect(result.current[0]).toBe(0)

    jest.runAllTimers()

    expect(result.current[0]).toBe(1)
  })

  it('does not set state if component is unmounted', async () => {
    const { result, unmount } = renderHook(() => useStateIfMounted(0))
    const [state, setState] = result.current

    expect(state).toBe(0)

    setTimeout(
      () =>
        act(() => {
          setState(1)
        }),
      1000
    )

    unmount()
    jest.runAllTimers()

    expect(state).toBe(0)
  })
})
