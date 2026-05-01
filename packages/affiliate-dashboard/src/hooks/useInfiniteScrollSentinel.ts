import type { RefCallback, RefObject } from 'react'
import { useCallback, useEffect, useRef } from 'react'

interface Options {
  hasMore: boolean
  isFetching: boolean
  onLoadMore: () => void
  root?: RefObject<Element | null>
  rootMargin?: string
}

export const useInfiniteScrollSentinel = <T extends Element>({
  hasMore,
  isFetching,
  onLoadMore,
  root,
  rootMargin = '200px',
}: Options): RefCallback<T> => {
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef(onLoadMore)
  loadMoreRef.current = onLoadMore

  useEffect(() => () => observerRef.current?.disconnect(), [])

  return useCallback(
    (node: T | null) => {
      observerRef.current?.disconnect()
      if (!node || !hasMore || isFetching) return

      observerRef.current = new IntersectionObserver(
        entries => {
          if (entries.some(entry => entry.isIntersecting)) loadMoreRef.current()
        },
        { root: root?.current ?? null, rootMargin },
      )
      observerRef.current.observe(node)
    },
    [hasMore, isFetching, root, rootMargin],
  )
}
