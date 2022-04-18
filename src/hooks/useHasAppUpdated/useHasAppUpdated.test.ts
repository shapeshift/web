import { act, renderHook } from '@testing-library/react-hooks'
import axios from 'axios'

import { useHasAppUpdated } from './useHasAppUpdated'

jest.mock('axios')
const mockAxios = axios as jest.Mocked<typeof axios>

describe('useHasAppUpdated', () => {
  afterEach(() => {
    jest.resetAllMocks()
    jest.clearAllTimers()
  })
  afterAll(() => {
    jest.resetAllMocks()
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  const APP_UPDATE_CHECK_INTERVAL = 1000 * 60

  it('should return false when env.json/asset-manifest.json is not updated', async () => {
    jest.useFakeTimers('legacy')
    jest.spyOn(window, 'setInterval')

    mockAxios.get.mockImplementation((url: string) => {
      return Promise.resolve({ data: {} })
    })

    const { result } = renderHook(() => useHasAppUpdated())
    expect(result.current).toBe(false)
  })

  it('should return true when env.json is updated', async () => {
    jest.useFakeTimers('legacy')
    jest.spyOn(window, 'setInterval')

    mockAxios.get.mockImplementation((url: string) => {
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

    await waitForNextUpdate()
    expect(result.current).toBe(true)
  })

  it('should return true when asset-manifest.json is updated', async () => {
    jest.useFakeTimers('legacy')
    jest.spyOn(window, 'setInterval')
    mockAxios.get.mockImplementation((url: string) => {
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

    await waitForNextUpdate()
    expect(result.current).toBe(true)
  })
})
