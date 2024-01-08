import { describe, expect, it, vi } from 'vitest'

import { poll } from './poll'

describe('poll', () => {
  it('should resolve if validate returns true on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('data')
    const validate = vi.fn().mockReturnValue(true)

    const { promise } = poll({ fn, validate, interval: 100, maxAttempts: 3 })
    const result = await promise

    expect(fn).toHaveBeenCalledTimes(1)
    expect(validate).toHaveBeenCalledTimes(1)
    expect(result).toBe('data')
  })

  it('should reject with "Exceeded max attempts" when maxAttempts is reached', async () => {
    const fn = vi.fn().mockResolvedValue('data')
    const validate = vi.fn().mockReturnValue(false)

    const { promise } = poll({ fn, validate, interval: 100, maxAttempts: 3 })

    await expect(promise).rejects.toThrow('Exceeded max attempts')
    expect(fn).toHaveBeenCalledTimes(3)
    expect(validate).toHaveBeenCalledTimes(3)
  })

  it('should not resolve or reject after polling is cancelled', async () => {
    const fn = vi.fn().mockImplementation(() => new Promise(() => {})) // Promise that doesn't resolve or reject
    const validate = vi.fn().mockReturnValue(false)

    const { promise, cancelPolling } = poll({ fn, validate, interval: 100, maxAttempts: 3 })

    let hasFinished = false
    promise.then(
      () => {
        hasFinished = true
      },
      () => {
        hasFinished = true
      },
    )

    // Cancel polling after 0.15 seconds
    setTimeout(cancelPolling, 150)

    // Wait longer than the polling interval
    await new Promise(resolve => setTimeout(resolve, 200))

    expect(hasFinished).toBe(false)
  })

  it('should poll until validate function returns true', async () => {
    const fn = vi
      .fn()
      .mockResolvedValueOnce('data1')
      .mockResolvedValueOnce('data2')
      .mockResolvedValueOnce('data3')
      .mockResolvedValueOnce('data4')
    const validate = vi
      .fn()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)

    const { promise } = poll({ fn, validate, interval: 100, maxAttempts: 10 })
    const result = await promise

    expect(fn).toHaveBeenCalledTimes(4)
    expect(validate).toHaveBeenCalledTimes(4)
    expect(result).toBe('data4')
  })

  it('should reject when the promise returned by fn rejects', async () => {
    const error = new Error('Error in fn')
    const fn = vi.fn().mockRejectedValue(error)
    const validate = vi.fn().mockReturnValue(false)

    const { promise } = poll({ fn, validate, interval: 100, maxAttempts: 3 })

    await expect(promise).rejects.toThrow('Error in fn')
    expect(fn).toHaveBeenCalledTimes(1)
    expect(validate).toHaveBeenCalledTimes(0)
  })
})
