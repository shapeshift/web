import { Flex } from '@chakra-ui/layout'
import { Image } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/types'
import pending from 'assets/pending.svg'
import { Text } from 'components/Text'
import { BigNumber } from 'lib/bignumber/bignumber'

type UnbondingRowProps = {
  asset: Asset
  unbondedAmount: BigNumber
  fiatRate: BigNumber
}

export const UnbondingRow = ({ asset, unbondedAmount, fiatRate }: UnbondingRowProps) => (
  <Flex
    bgColor='#222a38'
    pl='8px'
    pr='15px'
    py='10px'
    borderRadius='8px'
    justifyContent='space-between'
    mt='15px'
  >
    <Flex alignItems='center'>
      <Image src={pending} width='40px' height='40px' mr='10px' />
      <Flex direction='column'>
        <Text translation={'defi.unstaking'} fontWeight='bold' color='white' />
        <Text translation={'Available in 8 days'} color='gray.500' />
      </Flex>
    </Flex>
    <Flex direction='column' alignItems='flex-end'>
      <Text
        translation={unbondedAmount.times(fiatRate).toPrecision()}
        fontWeight='bold'
        color='white'
      />
      <Text translation={unbondedAmount + ' ' + asset.symbol} color='gray.500' />
    </Flex>
  </Flex>
)
