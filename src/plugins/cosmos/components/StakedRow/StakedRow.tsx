import { Flex, FlexProps } from '@chakra-ui/layout'
import { Text as CText } from '@chakra-ui/react'
import { AprTag } from 'plugins/cosmos/components/AprTag/AprTag'
import { Text } from 'components/Text'
import { BigNumber } from 'lib/bignumber/bignumber'

type StakedRowProps = {
  assetSymbol: string
  cryptoStakedAmount: BigNumber
  fiatRate: BigNumber
  apr: BigNumber
}
export const StakedRow = ({
  cryptoStakedAmount,
  fiatRate,
  assetSymbol,
  apr,
  ...styleProps
}: StakedRowProps & FlexProps) => (
  <Flex width='100%' justifyContent='space-between' {...styleProps}>
    <Flex>
      <Text translation={'defi.staked'} marginRight='20px' />
      <AprTag height='20px' percentage={apr.toPrecision()} />
    </Flex>
    <Flex direction='column' alignItems='flex-end'>
      <CText fontWeight='semibold'>{`$${cryptoStakedAmount.times(fiatRate).toPrecision()}`}</CText>
      <CText color='gray.500'>{cryptoStakedAmount + ' ' + assetSymbol}</CText>
    </Flex>
  </Flex>
)
