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

    it('should return true when metadata.json is updated', async () => {
      mockAxios.get.mockImplementation(() => {
        return Promise.resolve({ data: {} })
      })

      const { result } = renderHook(() => useHasAppUpdated())

      mockAxios.get.mockImplementationOnce((url: string) => {
        if (url.includes('metadata.json')) return Promise.resolve({ data: { change: true } })
        else return Promise.resolve({ data: {} })
      })

      await waitFor(() => expect(result.current).toBe(true))
    })

    it('should return false when metadata.json is not updated', async () => {
      mockAxios.get.mockImplementation(() => {
        return Promise.resolve({ data: {} })
      })

      const { result } = renderHook(() => useHasAppUpdated())

      await waitFor(() => expect(result.current).toBe(false))
    })

    it('should return false when axios fails', async () => {
      mockAxios.get.mockImplementation(() => {
        return Promise.resolve({ data: {} })
      })

      const { result } = renderHook(useHasAppUpdated)

      mockAxios.get.mockImplementationOnce(() => {
        return Promise.reject({ error: {} })
      })

      await waitFor(() => expect(result.current).toBe(false))
    })
  })

  describe('localhost', () => {
    beforeEach(() => {
      jest.spyOn(window, 'location', 'get').mockReturnValue({
        ...window.location,
        hostname: 'localhost',
      })
    })

    it('should return false for localhost', async () => {
      mockAxios.get.mockImplementation(() => {
        return Promise.resolve({ data: {} })
      })

      const { result } = renderHook(() => useHasAppUpdated())

      expect(mockAxios.get.mock.calls.length).toEqual(0)

      act(() => {
        jest.advanceTimersByTime(APP_UPDATE_CHECK_INTERVAL)
      })

      expect(mockAxios.get.mock.calls.length).toEqual(0)

      mockAxios.get.mockImplementationOnce((url: string) => {
        if (url.includes('metadata.json')) return Promise.resolve({ data: { change: true } })
        else return Promise.resolve({ data: {} })
      })

      await waitFor(() => expect(result.current).toBe(false))
      expect(mockAxios.get.mock.calls.length).toEqual(0)
    })

    it('should not make network requests on localhost', async () => {
      mockAxios.get.mockImplementation(() => {
        return Promise.resolve({ data: {} })
      })

      act(() => {
        jest.advanceTimersByTime(APP_UPDATE_CHECK_INTERVAL)
      })

      mockAxios.get.mockImplementationOnce(() => Promise.resolve({ data: {} }))

      await waitFor(() => undefined)
      expect(mockAxios.get.mock.calls.length).toEqual(0)
    })
  })
})
