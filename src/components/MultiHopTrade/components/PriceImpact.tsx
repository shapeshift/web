import type { FlexProps, IconProps } from '@chakra-ui/react'
import { Text as CText, useColorModeValue } from '@chakra-ui/react'
import type { FC } from 'react'
import { useMemo } from 'react'
import { MdOfflineBolt } from 'react-icons/md'
import { useTranslate } from 'react-polyglot'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'

interface PriceImpactProps {
  impactPercentage: string
}

const flexProps: FlexProps = { flexDirection: 'row' }

export const PriceImpact: FC<PriceImpactProps> = ({ impactPercentage }) => {
  const translate = useTranslate()
  const redText = useColorModeValue('red.500', 'red.400')
  const iconProps: IconProps = useMemo(() => ({ color: redText }), [redText])

  return (
    <Row fontSize='sm' flex={1}>
      <Row.Label display='flex' alignItems='center' gap={1}>
        <Text translation='trade.priceImpact' />
        <RawText as='span' fontSize='lg' color='gray.500'>
          <MdOfflineBolt />
        </RawText>
      </Row.Label>
      <Row.Value>
        <HelperTooltip
          label={translate('trade.tooltip.priceImpact')}
          flexProps={flexProps}
          iconProps={iconProps}
        >
          <CText color={redText}>{impactPercentage} %</CText>
        </HelperTooltip>
      </Row.Value>
    </Row>
  )
}
