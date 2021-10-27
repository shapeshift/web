import { useCallback, useMemo, useState } from 'react'

const defaultAmount = 10

export const useInfiniteScroll = (array: any[]) => {
  const [amount, setAmount] = useState(defaultAmount)

  const next = useCallback(() => {
    setAmount(amount + defaultAmount)
  }, [amount])

  const data = useMemo(() => array.slice(0, amount), [amount, array])
  const hasMore = useMemo(() => array.length !== data.length, [data, array])

  return {
    next,
    data,
    hasMore
  }
}
