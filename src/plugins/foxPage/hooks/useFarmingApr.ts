import { useEffect, useState } from 'react'

import { getFarmingApr } from '../utils/getFarmingApr'

export const useFarmingApr = () => {
  const [farmingApr, setFarmingApr] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    ;(async () => {
      const farmingApr = await getFarmingApr()
      setFarmingApr(farmingApr)
      setLoaded(true)
    })()
  }, [])

  return { loaded, farmingApr }
}
