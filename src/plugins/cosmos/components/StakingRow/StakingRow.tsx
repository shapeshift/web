import { Flex, FlexProps } from '@chakra-ui/layout'
import { Text as CText } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/types'
import { AprTag } from 'plugins/cosmos/components/AprTag/AprTag'
import { Text } from 'components/Text'
import { BigNumber } from 'lib/bignumber/bignumber'

type StakingRowProps = {
  asset: Asset
  stakedAmount: BigNumber
  fiatRate: BigNumber
  apr: BigNumber
}
export const StakingRow = ({
  stakedAmount,
  fiatRate,
  asset,
  apr,
  ...styleProps
}: StakingRowProps & FlexProps) => (
  <Flex width='100%' justifyContent='space-between' {...styleProps}>
    <Flex height='20px'>
      <Text translation={'defi.staked'} marginRight='20px' />
      <AprTag percentage={apr.toPrecision()} />
    </Flex>
    <Flex direction='column' alignItems='flex-end'>
      <CText fontWeight='semibold'>{`$${stakedAmount.times(fiatRate).toPrecision()}`}</CText>
      <CText color='gray.500'>{stakedAmount + ' ' + asset.symbol}</CText>
    </Flex>
  </Flex>
)
