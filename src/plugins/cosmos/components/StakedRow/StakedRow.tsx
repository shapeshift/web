import { Stack, StackProps } from '@chakra-ui/layout'
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
}: StakedRowProps & StackProps) => {
  return (
    <Stack width='100%' py={8} alignItems='center' {...styleProps}>
      <Text translation={'defi.amountStaked'} color='gray.500' />
      <Stack direction='row' alignItems='center'>
        <AssetIcon src={assetIcon} boxSize='10' />
        <Amount.Crypto
          fontSize='3xl'
          fontWeight='medium'
          value={cryptoStakedAmount.toString()}
          symbol={assetSymbol}
        />
      </Stack>
      <AprTag percentage={apr.toPrecision()} showAprSuffix={true} />
    </Stack>
  )
}
