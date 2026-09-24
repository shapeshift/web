import type { FlexProps } from '@chakra-ui/react'
import { Flex, Text } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'

type YieldNetworkFeeRowProps = {
  networkFeeCryptoPrecision: string | undefined
  symbol: string | undefined
  isInsufficient: boolean
} & Pick<FlexProps, 'mt'>

export const YieldNetworkFeeRow = ({
  networkFeeCryptoPrecision,
  symbol,
  isInsufficient,
  mt,
}: YieldNetworkFeeRowProps) => {
  const translate = useTranslate()

  if (!networkFeeCryptoPrecision || !symbol) return null

  return (
    <Flex justify='space-between' align='center' mt={mt}>
      <Text fontSize='sm' color='text.subtle'>
        {translate('trade.networkFee')}
      </Text>
      <Text fontSize='sm' color={isInsufficient ? 'red.500' : 'text.base'} fontWeight='medium'>
        <Amount.Crypto value={networkFeeCryptoPrecision} symbol={symbol} />
      </Text>
    </Flex>
  )
}
