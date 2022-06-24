import { act, renderHook, waitFor } from '@testing-library/react'
import axios from 'axios'

import { APP_UPDATE_CHECK_INTERVAL, useHasAppUpdated } from './useHasAppUpdated'

jest.mock('axios')
const mockAxios = axios as jest.Mocked<typeof axios>

describe('useHasAppUpdated', () => {
  beforeEach(() => {
    jest.useFakeTimers('legacy')
    jest.spyOn(window, 'setInterval')
  })
  afterEach(() => {
    jest.resetAllMocks()
    jest.clearAllTimers()
  })
  afterAll(() => {
    jest.useRealTimers()
  })

  describe('hosted environments', () => {
    beforeEach(() => {
      jest.spyOn(window, 'location', 'get').mockReturnValue({
        ...window.location,
        hostname: 'https://www.example.com',
      })
    })

    fit('should return false when env.json/asset-manifest.json is not updated', async () => {
      mockAxios.get.mockImplementation(() => {
        return Promise.resolve({ data: {} })
      })

      const { result } = renderHook(() => useHasAppUpdated())
      await act(async () => void 0)
      expect(result.current).toBe(false)
    })

    fit('should return true when env.json is updated', async () => {
      mockAxios.get.mockImplementation(() => {
        return Promise.resolve({ data: {} })
      })

      const { result } = renderHook(() => useHasAppUpdated())

      act(() => {
        jest.advanceTimersByTime(APP_UPDATE_CHECK_INTERVAL)
      })

      mockAxios.get.mockImplementationOnce((url: string) => {
        if (url.includes('env.json')) return Promise.resolve({ data: { change: true } })
        else return Promise.resolve({ data: {} })
      })

      await waitFor(() => expect(result.current).toBe(true))
    })

    fit('should return true when asset-manifest.json is updated', async () => {
      mockAxios.get.mockImplementation(() => {
        return Promise.resolve({ data: {} })
      })

      const { result } = renderHook(() => useHasAppUpdated())

      act(() => {
        jest.advanceTimersByTime(APP_UPDATE_CHECK_INTERVAL)
      })

      mockAxios.get.mockImplementationOnce((url: string) => {
        if (url.includes('asset-manifest.json')) return Promise.resolve({ data: { change: true } })
        else return Promise.resolve({ data: {} })
      })

      await waitFor(() => expect(result.current).toBe(true))
    })
  })

  describe('localhost', () => {
    it('should return false when env.json/asset-manifest.json is not updated', async () => {
      mockAxios.get.mockImplementation(() => {
        return Promise.resolve({ data: {} })
      })

      const { result, waitForNextUpdate } = renderHook(() => useHasAppUpdated())

      await act(async () => waitForNextUpdate())
      expect(result.current).toBe(false)
    })

    beforeEach(() => {
      jest.spyOn(window, 'location', 'get').mockReturnValue({
        ...window.location,
        hostname: 'localhost',
      })
    })

    it('should return false when env.json updated', async () => {
      mockAxios.get.mockImplementation(() => {
        return Promise.resolve({ data: {} })
      })

      const { result, waitForNextUpdate } = renderHook(() => useHasAppUpdated())

      act(() => {
        jest.advanceTimersByTime(APP_UPDATE_CHECK_INTERVAL)
      })

      mockAxios.get.mockImplementationOnce((url: string) => {
        if (url.includes('env.json')) return Promise.resolve({ data: { change: true } })
        else return Promise.resolve({ data: {} })
      })

      await act(async () => waitForNextUpdate())
      expect(result.current).toBe(false)
    })

    it('should return false when asset-manifest.json is updated', async () => {
      mockAxios.get.mockImplementation(() => {
        return Promise.resolve({ data: {} })
      })

      const { result, waitForNextUpdate } = renderHook(() => useHasAppUpdated())

      act(() => {
        jest.advanceTimersByTime(APP_UPDATE_CHECK_INTERVAL)
      })

      mockAxios.get.mockImplementationOnce((url: string) => {
        if (url.includes('asset-manifest.json')) return Promise.resolve({ data: { change: true } })
        else return Promise.resolve({ data: {} })
      })

      await act(async () => waitForNextUpdate())
      expect(result.current).toBe(false)
    })
  })
})
