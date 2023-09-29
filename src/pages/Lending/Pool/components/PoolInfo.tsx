import { CheckCircleIcon } from '@chakra-ui/icons'
import { Flex } from '@chakra-ui/react'
import { Tag, TagLeftIcon } from '@chakra-ui/tag'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { RawText, Text } from 'components/Text'

import { DynamicComponent } from './PoolStat'

export const PoolInfo = () => {
  const translate = useTranslate()
  return (
    <>
      <Flex gap={4} alignItems='center'>
        <Text translation='lending.poolInformation' fontWeight='medium' />
        <Tag colorScheme='green'>
          <TagLeftIcon as={CheckCircleIcon} />
          {translate('lending.healthy')}
        </Tag>
      </Flex>
      <Flex>
        <DynamicComponent
          label='lending.totalCollateral'
          component={<Amount.Crypto fontSize='lg' value='25' symbol='BTC' />}
          flex={1}
          labelProps={{ fontSize: 'sm ' }}
        />
        <DynamicComponent
          label='lending.totalDebtBalance'
          component={<Amount.Fiat fontSize='lg' value={25} />}
          flex={1}
          labelProps={{ fontSize: 'sm ' }}
        />
      </Flex>
      <Flex>
        <DynamicComponent
          label='lending.estCollateralizationRatio'
          component={<Amount.Percent value={2.93} color='text.success' fontSize='lg' />}
          flex={1}
          labelProps={{ fontSize: 'sm ' }}
        />
        <DynamicComponent
          label='lending.totalBorrowers'
          component={<RawText fontSize='lg'>123</RawText>}
          flex={1}
          labelProps={{ fontSize: 'sm ' }}
        />
      </Flex>
    </>
  )
}
