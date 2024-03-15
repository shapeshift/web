import { useCallback, useMemo, useState } from 'react'

const defaultAmount = 20

export const useInfiniteScroll = (array: any[]) => {
  const [amount, setAmount] = useState(defaultAmount)

  const next = useCallback(() => {
    setAmount(prevAmount => prevAmount + defaultAmount)
  }, [])

  const data = useMemo(() => array.slice(0, amount), [amount, array])
  const hasMore = useMemo(() => array.length !== data.length, [data, array])

  return {
    next,
    data,
    hasMore,
  }
}
