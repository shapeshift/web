import { useLayoutEffect, useState } from 'react'

export const useIsOverflow = (
  ref: React.RefObject<HTMLElement>,
  callback?: (isOverflow: boolean) => void,
): boolean | undefined => {
  const [isOverflow, setIsOverflow] = useState<boolean | undefined>(undefined)

  useLayoutEffect(() => {
    const { current } = ref

    const trigger = () => {
      if (current) {
        const hasOverflow = current.scrollWidth > current.clientWidth
        setIsOverflow(hasOverflow)
        if (callback) callback(hasOverflow)
      }
    }

    if (current) {
      trigger()
    }
  }, [callback, ref])

  return isOverflow
}
