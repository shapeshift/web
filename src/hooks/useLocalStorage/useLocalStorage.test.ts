import { act, renderHook } from '@testing-library/react-hooks'

import { useLocalStorage } from './useLocalStorage'

afterEach(() => {
  const { result } = renderHook(() => useLocalStorage<Record<string, string>>('testString', null))
  const [, setLocalValue] = result.current
  act(() => setLocalValue(null))
})

describe('useLocalStorage hook', () => {
  it('should be null if not set', () => {
    expect(localStorage.getItem('testString')).toBe(null)
  })

  it('should store string values', () => {
    const { result } = renderHook(() => useLocalStorage<Record<string, string>>('testString', null))
    const [, setLocalValue] = result.current
    act(() => setLocalValue({ testValue: 'This is a test' }))
    expect(JSON.parse(localStorage.getItem('testString') || '{}')).toStrictEqual({
      testValue: 'This is a test'
    })
  })
})
