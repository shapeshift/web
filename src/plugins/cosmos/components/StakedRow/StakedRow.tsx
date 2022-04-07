import { Flex, FlexProps } from '@chakra-ui/layout'
import { AprTag } from 'plugins/cosmos/components/AprTag/AprTag'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Text } from 'components/Text'
import { BigNumber } from 'lib/bignumber/bignumber'

type StakedRowProps = {
  assetSymbol: string
  assetIcon: string
  cryptoStakedAmount: BigNumber
  fiatRate: BigNumber
  apr: BigNumber
}

export const StakedRow = ({
  cryptoStakedAmount,
  fiatRate,
  assetSymbol,
  assetIcon,
  apr,
  ...styleProps
}: StakedRowProps & FlexProps) => {
  return (
    <Flex width='100%' flexDirection='column' alignItems='center' {...styleProps}>
      <Text translation={'defi.amountStaked'} color='gray.500' />

      <Flex alignItems='center'>
        <AssetIcon src={assetIcon} boxSize='40px' mr='24px' />
        <Amount.Crypto fontSize='28' value={cryptoStakedAmount.toString()} symbol={assetSymbol} />
      </Flex>
      <AprTag height='20px' percentage={apr.toPrecision()} showAprSuffix={true} />
    </Flex>
  )
}
