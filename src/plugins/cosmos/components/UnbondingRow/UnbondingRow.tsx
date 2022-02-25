import { Flex } from '@chakra-ui/layout'
import { Image } from '@chakra-ui/react'
import pending from 'assets/pending.svg'
import { Amount } from 'components/Amount/Amount'
import { Text } from 'components/Text'
import { BigNumber } from 'lib/bignumber/bignumber'

type UnbondingRowProps = {
  assetSymbol: string
  cryptoUnbondedAmount: BigNumber
  fiatRate: BigNumber
  unbondingEnd: string // TODO: use timestamp and convert it to "x hours/days"
}

export const UnbondingRow = ({
  assetSymbol,
  cryptoUnbondedAmount,
  fiatRate,
  unbondingEnd
}: UnbondingRowProps) => (
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
        <Text translation={['defi.availableIn', { unbondingEnd }]} color='gray.500' />
      </Flex>
    </Flex>
    <Flex direction='column' alignItems='flex-end'>
      <Amount.Fiat
        fontWeight='light'
        value={cryptoUnbondedAmount.times(fiatRate).toPrecision()}
        color='white'
      />
      <Amount.Crypto
        color='gray.500'
        value={cryptoUnbondedAmount.toString()}
        symbol={assetSymbol}
      />
    </Flex>
  </Flex>
)
