import { Flex, FlexProps } from '@chakra-ui/layout'
import { Asset } from '@shapeshiftoss/types'
import { Text } from 'components/Text'
import { BigNumber } from 'lib/bignumber/bignumber'

type RewardsRowProps = {
  asset: Asset
  rewardsAmount: BigNumber
  fiatRate: BigNumber
}

export const RewardsRow = ({
  asset,
  rewardsAmount,
  fiatRate,
  ...styleProps
}: RewardsRowProps & FlexProps) => (
  <Flex {...styleProps}>
    <Flex width='50%' height='20px'>
      <Text translation={'defi.rewards'} />
    </Flex>
    <Flex direction='column' alignItems='flex-end' width='100%'>
      <Text
        translation={`$${rewardsAmount.times(fiatRate).toPrecision()}`}
        fontWeight='semibold'
        color='green.500'
      />
      <Text translation={rewardsAmount + ' ' + asset.symbol} color='gray.500' />
    </Flex>
  </Flex>
)
