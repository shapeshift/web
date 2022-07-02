import { useEffect, useState } from 'react'

import { getLpApr } from '../utils/getLpApr'

export const useLpApr = () => {
  const [lpApr, setLpApr] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    ;(async () => {
      const lpApr = await getLpApr()
      setLpApr(lpApr)
      setLoaded(true)
    })()
  }, [])

  return { loaded, lpApr }
}
