import values from 'lodash/values'
import { useEffect, useState } from 'react'
import { apiSlices } from 'state/reducer'

/**
 * does any RTK query API have an outstanding promise?
 */
export const useIsAnyApiFetching = (): boolean => {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const POLL_INTERVAL = 2000 // tune me to make this "feel" right

  useEffect(() => {
    const interval = setInterval(() => {
      const promises = values(apiSlices).flatMap(api => api.util.getRunningOperationPromises())
      setIsLoading(Boolean(promises.length))
    }, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [])

  return isLoading
}
