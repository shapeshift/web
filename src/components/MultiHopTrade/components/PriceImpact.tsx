import type { BigNumber } from '@shapeshiftoss/utils'
import { bnOrZero } from '@shapeshiftoss/utils'
import type { FC } from 'react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'

import { usePriceImpactColor } from '../hooks/usePriceImpactColor'

interface PriceImpactProps {
  priceImpactPercentage: BigNumber | undefined
}

export const PriceImpact: FC<PriceImpactProps> = ({
  priceImpactPercentage: priceImpactPercentageBn,
}) => {
  const translate = useTranslate()

  const priceImpactPercentage = useMemo(
    () => bnOrZero(priceImpactPercentageBn).toFixed(2),
    [priceImpactPercentageBn],
  )

  const priceImpactColor = usePriceImpactColor(priceImpactPercentage)

  const tooltipBody = useCallback(
    () => <RawText>{translate('trade.tooltip.priceImpact')}</RawText>,
    [translate],
  )

  return (
    <Row fontSize='sm' flex={1} Tooltipbody={tooltipBody}>
      <Row.Label display='flex' alignItems='center' gap={1}>
        <Text translation='trade.priceImpact' />
      </Row.Label>
      <Row.Value>
        <RawText color={priceImpactColor}>{priceImpactPercentage} %</RawText>
      </Row.Value>
    </Row>
  )
}
