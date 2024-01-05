import { renderHook, waitFor } from '@testing-library/react'
import { act } from 'react-dom/test-utils'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { APP_UPDATE_CHECK_INTERVAL, useHasAppUpdated } from './useHasAppUpdated'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('axios', () => {
  const mockAxios = {
    default: {
      create: vi.fn(() => ({
        get: mocks.get,
        post: mocks.post,
      })),
    },
  }

  return {
    default: {
      ...mockAxios.default.create(),
      create: mockAxios.default.create,
    },
  }
})

describe('useHasAppUpdated', () => {
  vi.spyOn(window, 'setInterval')
  vi.useFakeTimers()

  beforeEach(() => {
    vi.unstubAllGlobals()
  })
  beforeAll(() => {
    vi.clearAllTimers()
  })
  afterEach(() => {
    vi.resetAllMocks()
    vi.clearAllTimers()
  })

  describe('hosted environments', () => {
    it('should return true when metadata.json is updated', async () => {
      vi.stubGlobal('location', {
        hostname: 'https://www.example.com',
      })
      mocks.get.mockImplementation(() => {
        return Promise.resolve({ data: {} })
      })

      const { result } = renderHook(() => useHasAppUpdated())

      mocks.get.mockImplementationOnce((url: string) => {
        if (url.includes('metadata.json')) return Promise.resolve({ data: { change: true } })
        else return Promise.resolve({ data: {} })
      })

      act(() => {
        vi.advanceTimersByTime(APP_UPDATE_CHECK_INTERVAL)
      })
      await vi.waitFor(() => {
        return expect(result.current).toBe(true)
      })
    })
    it('should return false when metadata.json is not updated', async () => {
      vi.stubGlobal('location', {
        hostname: 'https://www.example.com',
      })
      mocks.get.mockImplementation(() => {
        return Promise.resolve({ data: {} })
      })

      const { result } = renderHook(() => useHasAppUpdated())

      await waitFor(() => expect(result.current).toBe(false))
    })

    it('should return false when axios fails', async () => {
      vi.stubGlobal('location', {
        hostname: 'https://www.example.com',
      })
      mocks.get.mockImplementation(() => {
        return Promise.resolve({ data: {} })
      })

      const { result } = renderHook(useHasAppUpdated)

      mocks.get.mockImplementationOnce(() => {
        return Promise.reject({ error: {} })
      })

      await vi.waitFor(() => expect(result.current).toBe(false))
    })
  })

  describe('localhost', () => {
    it('should return false for localhost', async () => {
      vi.stubGlobal('location', {
        hostname: 'localhost',
      })
      mocks.get.mockImplementation(() => {
        return Promise.resolve({ data: {} })
      })

      const { result } = renderHook(() => useHasAppUpdated())

      expect(mocks.get.mock.calls.length).toEqual(0)

      act(() => {
        vi.advanceTimersByTime(APP_UPDATE_CHECK_INTERVAL)
      })

      expect(mocks.get.mock.calls.length).toEqual(0)

      mocks.get.mockImplementationOnce((url: string) => {
        if (url.includes('metadata.json')) return Promise.resolve({ data: { change: true } })
        else return Promise.resolve({ data: {} })
      })

      await waitFor(() => expect(result.current).toBe(false))
      expect(mocks.get.mock.calls.length).toEqual(0)
    })

    it('should not make network requests on localhost', async () => {
      vi.stubGlobal('location', {
        hostname: 'localhost',
      })
      mocks.get.mockImplementation(() => {
        return Promise.resolve({ data: {} })
      })

      act(() => {
        vi.advanceTimersByTime(APP_UPDATE_CHECK_INTERVAL)
      })

      mocks.get.mockImplementationOnce(() => Promise.resolve({ data: {} }))

      await vi.waitFor(() => undefined)
      expect(mocks.get.mock.calls.length).toEqual(0)
    })
  })
})
