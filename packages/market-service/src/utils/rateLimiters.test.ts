import axios, { AxiosAdapter, AxiosRequestConfig } from 'axios'
import { RateLimiter as ServerRateLimiter } from 'limiter'

import { createRateLimiter, rateLimitedAxios } from './rateLimiters'

describe('rate limiters utilities', () => {
  describe('should get rate limited', () => {
    it('using rateLimitedAxios', async () => {
      const totalRequests = 200

      let successCount = 0
      const axiosAdapterLimiterRate = 100
      const axiosAdapterLimiterInterval = 1000
      /**
       * this is for testing an external service that has a rate limit
       */
      const axiosAdapterLimiter = new ServerRateLimiter({
        tokensPerInterval: axiosAdapterLimiterRate,
        interval: axiosAdapterLimiterInterval,
        fireImmediately: true,
      })

      async function axiosTestAdapter(config: AxiosRequestConfig) {
        const remainingRequests = await axiosAdapterLimiter.removeTokens(1)

        // exceeded rateLimiter limit
        if (remainingRequests < 0) {
          throw { status: 429 }
        }
        return config
      }

      const testAxiosInstance = axios.create({ adapter: axiosTestAdapter as AxiosAdapter })

      const onSuccess = () => successCount++
      let errorStatus = null

      for (let i = 0; i < totalRequests; i++) {
        try {
          await testAxiosInstance.get('/')
          onSuccess()
        } catch (error) {
          errorStatus = error.status
        }
      }

      expect(successCount).toBeLessThan(totalRequests)
      expect(errorStatus).toBe(429)
    })

    it('using createRateLimiter', async () => {
      const totalCalls = 200

      const rateLimiterRate = 100
      const rateLimiterInterval = 1000
      let successCount = 0
      let errorStatus = null

      const functionLimiter = new ServerRateLimiter({
        tokensPerInterval: rateLimiterRate,
        interval: rateLimiterInterval,
        fireImmediately: true,
      })

      const functionToBeCalled = async () => {
        const remainingCalls = await functionLimiter.removeTokens(1)
        // exceeded rateLimiter limit
        if (remainingCalls < 0) {
          throw { status: 429 }
        }
        return true
      }

      const onSuccess = () => successCount++

      for (let i = 0; i < totalCalls; i++) {
        try {
          await functionToBeCalled()
          onSuccess()
        } catch (error) {
          errorStatus = error.status
        }
      }

      expect(errorStatus).toEqual(429)
      expect(successCount).toBeLessThan(totalCalls)
    })
  })

  describe('should not get rate limited', () => {
    it('using rateLimitedAxios', async () => {
      const totalRequests = 200

      let successCount = 0
      const axiosAdapterLimiterRate = 100
      const axiosAdapterLimiterInterval = 1000
      /**
       * this is for testing a service that has a rate limiter
       */
      const axiosAdapterLimiter = new ServerRateLimiter({
        tokensPerInterval: axiosAdapterLimiterRate,
        interval: axiosAdapterLimiterInterval,
        fireImmediately: true,
      })

      async function axiosTestAdapter(config: AxiosRequestConfig) {
        const remainingRequests = await axiosAdapterLimiter.removeTokens(1)
        // exceeded rateLimiter limit
        if (remainingRequests < 0) {
          throw { status: 429 }
        }
        return config
      }

      const testAxiosInstance = rateLimitedAxios(
        axiosAdapterLimiterRate,
        axiosAdapterLimiterInterval,
        axios.create({ adapter: axiosTestAdapter as AxiosAdapter }),
      )

      const onSuccess = () => successCount++

      let errorStatus = null
      const start = Date.now()
      for (let i = 0; i < totalRequests; i++) {
        try {
          await testAxiosInstance.get('/')
          onSuccess()
        } catch (error) {
          errorStatus = error.status
        }
      }
      const end = Date.now()

      /**
       * Ensure all requests have been processed
       * and time elapsed must be greater than
       * (totalRequests / axiosAdapterLimiterRate - 1) * axiosAdapterLimiterInterval
       * so that we know it's not getting rate limited
       */
      expect(errorStatus).toBeNull()
      expect(successCount).toEqual(totalRequests)
      expect(end - start).toBeGreaterThan(
        (totalRequests / axiosAdapterLimiterRate - 1) * axiosAdapterLimiterInterval,
      )
    })

    it('using createRateLimiter', async () => {
      const totalCalls = 200

      const rateLimiterRate = 100
      const rateLimiterInterval = 1000
      let successCount = 0
      let errorStatus = null

      const rateLimiter = createRateLimiter(rateLimiterRate, rateLimiterInterval)

      const functionLimiter = new ServerRateLimiter({
        tokensPerInterval: rateLimiterRate,
        interval: rateLimiterInterval,
        fireImmediately: true,
      })

      const functionToBeCalled = async () => {
        const remainingCalls = await functionLimiter.removeTokens(1)
        // exceeded rateLimiter limit
        if (remainingCalls < 0) {
          throw { status: 429 }
        }
        return true
      }

      const onSuccess = () => successCount++

      const start = Date.now()
      for (let i = 0; i < totalCalls; i++) {
        try {
          await rateLimiter(() => functionToBeCalled())
          onSuccess()
        } catch (error) {
          errorStatus = error.status
        }
      }
      const end = Date.now()

      /**
       * Ensure all calls have been processed
       * and time elapsed must be greater than
       * `(totalCalls / rateLimiterRate - 1) * rateLimiterInterval`
       * so that we know its not getting rate limited
       */
      expect(errorStatus).toBeNull()
      expect(successCount).toEqual(totalCalls)
      expect(end - start).toBeGreaterThan((totalCalls / rateLimiterRate - 1) * rateLimiterInterval)
    })
  })
})
