import { renderHook } from '@testing-library/react'

import { useEvent } from './useEvent'

describe('useEvent', () => {
  it('should call the callback provided when current result of the render is called', () => {
    const callback = jest.fn()
    const { result } = renderHook(value => useEvent(() => callback(value)), {
      initialProps: { value: '1' },
    })
    expect(callback).toHaveBeenCalledTimes(0)

    result.current()
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith({ value: '1' })
  })

  it('should not fire callback when callback changes', () => {
    const callback = jest.fn()
    const { result, rerender } = renderHook(value => useEvent(() => callback(value)), {
      initialProps: { value: '1' },
    })
    expect(callback).toHaveBeenCalledTimes(0)

    // first explicit callback call
    result.current()

    // re-render with different value
    rerender({ value: '2' })

    // callback is not called again when value changes
    expect(callback).toHaveBeenCalledTimes(1)

    // second explicit callback call
    result.current()

    // value is changed when we effectively call the callback
    expect(callback).toHaveBeenCalledTimes(2)
    expect(callback.mock.calls[1][0]).toEqual({ value: '2' })
  })

  it('should return a referentially stable event handler identity', () => {
    const callback = jest.fn()
    const { result, rerender } = renderHook(value => useEvent(() => callback(value)), {
      initialProps: { value: '1' },
    })

    const firstResult = result.current

    // re-render with different value
    rerender({ value: '2' })

    const secondResult = result.current

    expect(firstResult).toEqual(secondResult)
  })
})
