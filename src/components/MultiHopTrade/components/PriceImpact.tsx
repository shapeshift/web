import type { StyleProps } from '@chakra-ui/react'
import type { BigNumber } from '@shapeshiftoss/utils'
import type { FC } from 'react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'

import { Row } from '@/components/Row/Row'
import { RawText, Text } from '@/components/Text'

type PriceImpactProps = {
  priceImpactPercentage: BigNumber | undefined
  color: StyleProps['color']
}

export const PriceImpact: FC<PriceImpactProps> = ({ color, priceImpactPercentage }) => {
  const translate = useTranslate()

  const tooltipBody = useCallback(
    () => <RawText>{translate('trade.tooltip.inputOutputDifference')}</RawText>,
    [translate],
  )

  if (!priceImpactPercentage) return null

  return (
    <Row flex={1} Tooltipbody={tooltipBody}>
      <Row.Label display='flex' alignItems='center' gap={1}>
        <Text translation='trade.priceImpact' />
      </Row.Label>
      <Row.Value>
        <RawText color={color}>{priceImpactPercentage.toFixed(2)}%</RawText>
      </Row.Value>
    </Row>
  )
}
