import type { FlexProps } from '@chakra-ui/react'
import { Flex } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import type { BigNumber } from '@shapeshiftoss/utils'
import { bn } from '@shapeshiftoss/utils'
import { useCallback, useMemo, useState } from 'react'

import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'

const hoverDottedUnderline = { textDecorationStyle: 'solid' }

type TradeQuoteExchangeRateProps = FlexProps & {
  buyAsset: Asset
  sellAsset: Asset
  totalReceiveAmountCryptoPrecision: string
  sellAmountCryptoPrecision: string
}
export const TradeQuoteExchangeRate: React.FC<TradeQuoteExchangeRateProps> = ({
  sellAsset,
  buyAsset,
  totalReceiveAmountCryptoPrecision,
  sellAmountCryptoPrecision,
  ...rest
}) => {
  const [shouldFlipRate, setShouldFlipRate] = useState<boolean>(false)

  const exchangeRate = useMemo((): BigNumber.Value => {
    const rate = bn(totalReceiveAmountCryptoPrecision).dividedBy(bn(sellAmountCryptoPrecision))
    return shouldFlipRate ? bn(1).dividedBy(rate) : rate
  }, [totalReceiveAmountCryptoPrecision, sellAmountCryptoPrecision, shouldFlipRate])

  const {
    number: { toCrypto },
  } = useLocaleFormatter()

  const handleFlipRate = useCallback(
    (e: React.MouseEvent<HTMLDivElement, MouseEvent>): void => {
      e.stopPropagation()
      setShouldFlipRate(!shouldFlipRate)
    },
    [shouldFlipRate],
  )

  const fromAsset = shouldFlipRate ? buyAsset : sellAsset
  const toAsset = shouldFlipRate ? sellAsset : buyAsset

  return (
    <Flex
      gap={1}
      alignItems='center'
      fontSize='sm'
      fontWeight='medium'
      textUnderlineOffset='4px'
      textDecoration='underline dotted'
      onClick={handleFlipRate}
      _hover={hoverDottedUnderline}
      {...rest}
    >
      {`1 ${fromAsset.symbol} = ${toCrypto(exchangeRate, toAsset.symbol, {
        maximumFractionDigits: buyAsset.precision,
      })}`}
    </Flex>
  )
}
