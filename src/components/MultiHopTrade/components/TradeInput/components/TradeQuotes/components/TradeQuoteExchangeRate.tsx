import type { Asset } from '@shapeshiftoss/types'
import { bn } from '@shapeshiftoss/utils'
import { useCallback, useState } from 'react'

import { Amount } from '@/components/Amount/Amount'
import { clickableLinkSx } from '@/theme/styles'

type TradeQuoteExchangeRateProps = {
  rate: string
  buyAsset: Asset
  sellAsset: Asset
}
export const TradeQuoteExchangeRate: React.FC<TradeQuoteExchangeRateProps> = ({
  rate,
  sellAsset,
  buyAsset,
}) => {
  const [shouldInvertRate, setShouldInvertRate] = useState<boolean>(false)

  const handleClickRate = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>): void => {
    e.stopPropagation()
    setShouldInvertRate(prev => !prev)
  }, [])

  const prefix = shouldInvertRate ? `1 ${buyAsset.symbol} =` : `1 ${sellAsset.symbol} =`
  const value = shouldInvertRate ? bn(1).div(rate).toString() : rate
  const symbol = shouldInvertRate ? sellAsset.symbol : buyAsset.symbol

  return (
    <Amount.Crypto
      fontWeight='medium'
      onClick={handleClickRate}
      sx={clickableLinkSx}
      cursor='pointer'
      userSelect='none'
      prefix={prefix}
      value={value}
      symbol={symbol}
    />
  )
}
