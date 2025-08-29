import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useLocalStorage } from './useLocalStorage'

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

describe('useLocalStorage', () => {
  beforeEach(() => {
    mockLocalStorage.clear()
    vi.clearAllMocks()
  })

  it('should return initial value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default-value'))

    expect(result.current[0]).toBe('default-value')
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('test-key')
  })

  it('should return stored value from localStorage when available', () => {
    mockLocalStorage.setItem('test-key', JSON.stringify('stored-value'))

    const { result } = renderHook(() => useLocalStorage('test-key', 'default-value'))

    expect(result.current[0]).toBe('stored-value')
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('test-key')
  })

  it('should update both state and localStorage when setValue is called', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial-value'))

    act(() => {
      result.current[1]('new-value')
    })

    expect(result.current[0]).toBe('new-value')
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('test-key', JSON.stringify('new-value'))
  })

  it('should handle function updates correctly', () => {
    const { result } = renderHook(() => useLocalStorage('counter', 0))

    act(() => {
      result.current[1]((prev: number) => prev + 1)
    })

    expect(result.current[0]).toBe(1)
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('counter', JSON.stringify(1))

    act(() => {
      result.current[1]((prev: number) => prev * 2)
    })

    expect(result.current[0]).toBe(2)
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('counter', JSON.stringify(2))
  })

  it('should handle complex objects and arrays', () => {
    const testObject = { name: 'John', age: 30, hobbies: ['reading', 'coding'] }

    const { result } = renderHook(() => useLocalStorage('user-data', testObject))

    const updatedObject = { ...testObject, age: 31 }

    act(() => {
      result.current[1](updatedObject)
    })

    expect(result.current[0]).toEqual(updatedObject)
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'user-data',
      JSON.stringify(updatedObject),
    )

    // Test that it can read the complex object back
    const { result: result2 } = renderHook(() => useLocalStorage('user-data', {}))

    expect(result2.current[0]).toEqual(updatedObject)
  })
})
