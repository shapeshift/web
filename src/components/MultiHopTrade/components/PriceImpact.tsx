import { useColorModeValue } from '@chakra-ui/react'
import type { FC } from 'react'
import { FaBolt } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'

interface PriceImpactProps {
  impactPercentage: string
}

export const PriceImpact: FC<PriceImpactProps> = ({ impactPercentage }) => {
  const translate = useTranslate()
  const redText = useColorModeValue('red.500', 'red.400')

  return (
    <Row fontSize='sm' flex={1}>
      <Row.Label display='flex' alignItems='center' gap={1}>
        <FaBolt color='red.500' />
        <Text translation='trade.priceImpact' />
      </Row.Label>
      <Row.Value>
        <HelperTooltip
          label={translate('trade.tooltip.priceImpact')}
          flexProps={{ flexDirection: 'row' }}
          iconProps={{ color: redText }}
        >
          <Text translation={`${impactPercentage} %`} color={redText} />
        </HelperTooltip>
      </Row.Value>
    </Row>
  )
}
