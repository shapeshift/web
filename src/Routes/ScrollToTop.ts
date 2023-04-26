import { useEffect } from 'react'
import { useLocation } from 'react-router'

export const ScrollToTop = () => {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      // @ts-expect-error
      behavior: 'instant',
    })
  }, [pathname])

  return null
}
