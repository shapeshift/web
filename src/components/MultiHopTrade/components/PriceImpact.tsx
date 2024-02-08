import { Text as CText } from '@chakra-ui/react'
import type { FC } from 'react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { warningSeverity } from 'lib/utils'

interface PriceImpactProps {
  impactPercentage: string
}

export const PriceImpact: FC<PriceImpactProps> = ({ impactPercentage }) => {
  const translate = useTranslate()

  const priceImpactColor = useMemo(() => {
    if (!impactPercentage) return undefined
    if (bnOrZero(impactPercentage).isLessThan(0)) return 'text.success'
    const severity = warningSeverity(impactPercentage)
    if (severity < 1) return 'text.subtle'
    if (severity < 3) return 'text.warning'
    return 'text.danger'
  }, [impactPercentage])

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
        <CText color={priceImpactColor}>{impactPercentage} %</CText>
      </Row.Value>
    </Row>
  )
}
