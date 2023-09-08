import values from 'lodash/values'
import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { apiSlices } from 'state/reducer'

/**
 * does any RTK query API have an outstanding promise?
 */
export const useIsAnyApiFetching = (): boolean => {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const POLL_INTERVAL = 2000 // tune me to make this "feel" right
  const dispatch = useDispatch()

  useEffect(() => {
    const interval = setInterval(() => {
      const promises = values(apiSlices).flatMap(api => dispatch(api.util.getRunningQueriesThunk()))
      setIsLoading(Boolean(promises.length))
    }, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [dispatch])

  return isLoading
}
