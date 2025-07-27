import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'

const defaultAmount = 20

type UseInfiniteScrollProps<T> = {
  array: T[]
  initialTxsCount?: number
  isScrollable?: boolean
}

export const useInfiniteScroll = <T extends any>({
  array,
  initialTxsCount,
  isScrollable = false,
}: UseInfiniteScrollProps<T>) => {
  const [amount, setAmount] = useState(initialTxsCount ?? defaultAmount)

  const rawData = useMemo(() => array.slice(0, amount), [array, amount])
  const data = useDeferredValue(rawData)

  const next = useCallback(() => {
    setAmount(prevAmount => prevAmount + defaultAmount)
  }, [])

  const hasMore = useMemo(() => array.length > amount, [array.length, amount])

  useEffect(() => {
    if (!isScrollable) return

    const firstLoaderItem = document.querySelector('.infinite-table tbody tr:last-of-type')
    const scrollContainer = document.querySelector('html')

    if (!firstLoaderItem || !scrollContainer) {
      return
    }
    if (
      // The loading will continue only when the loader element appears on the scroll-container.
      firstLoaderItem.getBoundingClientRect().top < window.innerHeight
    ) {
      next()
    }
  }, [hasMore, isScrollable, next])

  return {
    next,
    data,
    hasMore,
  }
}
