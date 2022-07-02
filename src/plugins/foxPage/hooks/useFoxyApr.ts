import { useEffect, useState } from 'react'

import { getFoxyApr } from '../utils/getFoxyApr'

export const useFoxyApr = () => {
  const [foxyApr, setFoxyApr] = useState<string | null>(null)
  const [loaded, setLoaded] = useState<boolean>(false)

  useEffect(() => {
    ;(async () => {
      const foxyApr = await getFoxyApr()
      setFoxyApr(foxyApr)
      setLoaded(true)
    })()
  }, [])

  return { foxyApr, loaded }
}
