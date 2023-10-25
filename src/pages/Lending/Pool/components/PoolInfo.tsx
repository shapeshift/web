import { CheckCircleIcon } from '@chakra-ui/icons'
import { Flex } from '@chakra-ui/react'
import { Tag, TagLeftIcon } from '@chakra-ui/tag'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { RawText, Text } from 'components/Text'

import { DynamicComponent } from './PoolStat'

const labelProps = { fontSize: 'sm ' }

export const PoolInfo = () => {
  const translate = useTranslate()
  const totalCollateralComponent = useMemo(
    () => <Amount.Crypto fontSize='2xl' value='25' symbol='BTC' fontWeight='medium' />,
    [],
  )
  const totalDebtBalance = useMemo(
    () => <Amount.Fiat fontSize='2xl' value={25} fontWeight='medium' />,
    [],
  )
  const estCollateralizationRatioComponent = useMemo(
    () => <Amount.Percent value={2.93} color='text.success' fontSize='lg' />,
    [],
  )
  const totalBorrowersComponent = useMemo(() => <RawText fontSize='lg'>123</RawText>, [])
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
          component={totalCollateralComponent}
          flex={1}
          labelProps={labelProps}
        />
        <DynamicComponent
          label='lending.totalDebtBalance'
          component={totalDebtBalance}
          flex={1}
          labelProps={labelProps}
        />
      </Flex>
      <Flex>
        <DynamicComponent
          label='lending.estCollateralizationRatio'
          component={estCollateralizationRatioComponent}
          flex={1}
          labelProps={labelProps}
        />
        <DynamicComponent
          label='lending.totalBorrowers'
          component={totalBorrowersComponent}
          flex={1}
          labelProps={labelProps}
        />
      </Flex>
    </>
  )
}
