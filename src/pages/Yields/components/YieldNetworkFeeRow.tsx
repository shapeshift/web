import type { FlexProps } from '@chakra-ui/react'
import { Flex, Skeleton, Text } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'

type YieldNetworkFeeRowProps = {
  networkFeeCryptoPrecision: string | undefined
  symbol: string | undefined
  isInsufficient: boolean
  isLoading: boolean
  // there is no transaction to price yet, so the row holds its place with a dash
  isPlaceholder?: boolean
} & Pick<FlexProps, 'mt'>

export const YieldNetworkFeeRow = ({
  networkFeeCryptoPrecision,
  symbol,
  isInsufficient,
  isLoading,
  isPlaceholder,
  mt,
}: YieldNetworkFeeRowProps) => {
  const translate = useTranslate()

  const hasFee = Boolean(networkFeeCryptoPrecision && symbol)

  if (!hasFee && !isLoading && !isPlaceholder) return null

  if (isPlaceholder) {
    return (
      <Flex justify='space-between' align='center' mt={mt}>
        <Text fontSize='sm' color='text.subtle'>
          {translate('trade.networkFee')}
        </Text>
        <Text fontSize='sm' color='text.subtle' fontWeight='medium'>
          —
        </Text>
      </Flex>
    )
  }

  return (
    <Flex justify='space-between' align='center' mt={mt}>
      <Text fontSize='sm' color='text.subtle'>
        {translate('trade.networkFee')}
      </Text>
      <Skeleton isLoaded={hasFee} minW={hasFee ? undefined : '80px'}>
        <Text fontSize='sm' color={isInsufficient ? 'red.500' : 'text.base'} fontWeight='medium'>
          <Amount.Crypto value={networkFeeCryptoPrecision} symbol={symbol ?? ''} />
        </Text>
      </Skeleton>
    </Flex>
  )
}
