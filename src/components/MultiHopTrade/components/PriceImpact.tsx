import { Text as CText } from '@chakra-ui/react'
import type { FC } from 'react'
import { useCallback, useMemo } from 'react'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { warningSeverity } from 'lib/utils'

interface PriceImpactProps {
  impactPercentage: string
}

export const PriceImpact: FC<PriceImpactProps> = ({ impactPercentage }) => {
  const severity = useMemo(() => {
    if (!impactPercentage) return 0
    return warningSeverity(impactPercentage)
  }, [impactPercentage])

  const priceImpactColor = useMemo(() => {
    if (!impactPercentage) return undefined
    if (bnOrZero(impactPercentage).isLessThan(0)) return 'text.success'
    if (severity < 1) return 'text.base'
    if (severity < 3) return 'text.warning'
    return 'text.danger'
  }, [impactPercentage, severity])

  const toolTipLabel = useCallback(() => {
    if (severity > 1) {
      return <Text translation='trade.tooltip.priceImpactHigh' />
    }
    return <Text translation='trade.tooltip.priceImpact' />
  }, [severity])

  return (
    <Row flex={1} Tooltipbody={toolTipLabel}>
      <Row.Label>
        <Text translation='trade.priceImpact' />
      </Row.Label>
      <Row.Value>
        <CText color={priceImpactColor}>~ {impactPercentage}%</CText>
      </Row.Value>
    </Row>
  )
}
