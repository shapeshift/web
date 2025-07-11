import type { StyleProps } from '@chakra-ui/react'
import type { BigNumber } from '@shapeshiftoss/utils'
import type { FC } from 'react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
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

  const priceImpactDecimalPercentage = useMemo(
    () => priceImpactPercentage?.div(100),
    [priceImpactPercentage],
  )

  if (!priceImpactPercentage) return null

  return (
    <Row flex={1} Tooltipbody={tooltipBody}>
      <Row.Label display='flex' alignItems='center' gap={1}>
        <Text translation='trade.priceImpact' />
      </Row.Label>
      <Row.Value>
        <Amount.Percent value={priceImpactDecimalPercentage?.times(-1).toString()} color={color} />
      </Row.Value>
    </Row>
  )
}
