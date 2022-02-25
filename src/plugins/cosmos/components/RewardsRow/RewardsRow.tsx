import { Flex, FlexProps } from '@chakra-ui/layout'
import { Text as CText } from '@chakra-ui/react'
import { Amount } from 'components/Amount/Amount'
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
      <Amount.Fiat
        value={cryptoRewardsAmount.times(fiatRate).toPrecision()}
        fontWeight='semibold'
        color='green.500'
      />
      <Amount.Crypto
        color='gray.500'
        value={cryptoRewardsAmount.toPrecision()}
        symbol={assetSymbol}
      />
    </Flex>
  </Flex>
)
