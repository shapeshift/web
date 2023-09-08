import { useCallback, useEffect, useRef } from 'react'
import type { PollArgs } from 'lib/poll/poll'
import { poll as pollFn } from 'lib/poll/poll'

/**
 * Wraps `poll` for use in react components. Cancels polling on component unmount.
 */
export const usePoll = <T extends unknown>() => {
  const cancelPollingRef = useRef<() => void>(() => {})

  // cancel on component unmount so polling doesn't cause chaos after the component has unmounted
  useEffect(() => {
    return () => cancelPollingRef.current && cancelPollingRef.current()
  }, [])

  const poll = useCallback((pollArgs: PollArgs<T>) => {
    // cancel previous invocations
    cancelPollingRef.current && cancelPollingRef.current()

    // invoke
    const { promise, cancelPolling } = pollFn(pollArgs)

    // attach cancel callback
    cancelPollingRef.current = cancelPolling

    return promise
  }, [])

  return { poll, cancelPolling: cancelPollingRef.current }
}
