import { Stack, useColorModeValue } from '@chakra-ui/react'
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
  const borderColor = useColorModeValue('gray.100', 'gray.750')

  return (
    <Stack boxShadow='sm' p={4} borderColor={borderColor} borderRadius='xl' borderWidth={1}>
      <Stack direction='row' fontWeight='medium'>
        <Row fontSize='sm' flex={1}>
          <Row.Value fontSize='sm'>
            <HelperTooltip
              label={translate('trade.tooltip.priceImpact')}
              flexProps={{ flexDirection: 'row' }}
            >
              <Stack direction='row'>
                <FaBolt color='red.500' />
                <Text translation='trade.priceImpact' />
              </Stack>
            </HelperTooltip>
          </Row.Value>
        </Row>
        <Row justifyContent='flex-end' alignItems='center' width='auto' columnGap={2}>
          <Row.Value>
            <Text translation={`${impactPercentage} %`} color='red.500' />
          </Row.Value>
        </Row>
      </Stack>
    </Stack>
  )
}
