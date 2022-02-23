import { Flex, FlexProps } from '@chakra-ui/layout'
import { Text as CText } from '@chakra-ui/react'
import { Text } from 'components/Text'
import { BigNumber } from 'lib/bignumber/bignumber'

type RewardsRowProps = {
  assetSymbol: string
  cryptoRewardsAmount: BigNumber
  fiatRate: BigNumber
}

export const RewardsRow = ({
  assetSymbol,
  cryptoRewardsAmount,
  fiatRate,
  ...styleProps
}: RewardsRowProps & FlexProps) => (
  <Flex {...styleProps}>
    <Flex width='50%' height='20px'>
      <Text translation={'defi.rewards'} />
    </Flex>
    <Flex direction='column' alignItems='flex-end' width='100%'>
      <CText fontWeight='semibold' color='green.500'>
        {`$${cryptoRewardsAmount.times(fiatRate).toPrecision()}`}
      </CText>
      <CText color='gray.500'>{`${cryptoRewardsAmount} ${assetSymbol}`}</CText>
    </Flex>
  </Flex>
)
