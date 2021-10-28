import { act, renderHook } from '@testing-library/react-hooks'

import { useLocalStorage } from './useLocalStorage'

beforeAll(() => {
  const { result } = renderHook(() => useLocalStorage<Record<string, string>>('testString', null))
  const [, setLocalValue] = result.current
  act(() => setLocalValue(null))
})

afterAll(() => {
  const { result } = renderHook(() => useLocalStorage<Record<string, string>>('testString', null))
  const [, setLocalValue] = result.current
  act(() => setLocalValue(null))
})

describe('useLocalStorage hook', () => {
  it('should store values', () => {
    const { result } = renderHook(() => useLocalStorage<Record<string, string>>('testString', null))
    const [, setLocalValue] = result.current
    act(() => setLocalValue({ testValue: 'This is a test' }))
    expect(result.current[0]).toStrictEqual({ testValue: 'This is a test' })
  })

  it('should retrieve a stored value', () => {
    const { result } = renderHook(() => useLocalStorage<Record<string, string>>('testString', null))
    expect(result.current[0]).toStrictEqual({ testValue: 'This is a test' })
  })
})
