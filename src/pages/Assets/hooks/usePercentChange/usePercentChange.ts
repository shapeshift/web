import { HistoryData } from '@shapeshiftoss/types'
import BigNumber from 'bignumber.js'
import { useEffect, useState } from 'react'

export const usePercentChange = ({
  data,
  initPercentChange
}: {
  data?: HistoryData[]
  initPercentChange: number
}) => {
  const [percent, setPercentChange] = useState(initPercentChange)

  useEffect(() => {
    if (!data) return
    const startValue = data[0]?.price
    const endValue = data[data.length - 1]?.price
    if (startValue && endValue) {
      const change = new BigNumber(endValue)
        .minus(startValue)
        .div(new BigNumber(startValue).abs())
        .times(100)
        .toNumber()
      setPercentChange(change)
    }
  }, [data])

  return percent
}
