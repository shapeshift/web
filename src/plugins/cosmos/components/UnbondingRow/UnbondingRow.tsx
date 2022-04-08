import { Flex } from '@chakra-ui/layout'
import { Image } from '@chakra-ui/react'
import { useColorModeValue } from '@chakra-ui/react'
import dayjs from 'dayjs'
import pending from 'assets/pending.svg'
import { Amount } from 'components/Amount/Amount'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { BigNumber } from 'lib/bignumber/bignumber'

type UnbondingRowProps = {
  assetSymbol: string
  cryptoUnbondedAmount: BigNumber
  fiatRate: BigNumber
  unbondingEnd: number
}

export const UnbondingRow = ({
  assetSymbol,
  cryptoUnbondedAmount,
  fiatRate,
  unbondingEnd,
}: UnbondingRowProps) => {
  const bg = useColorModeValue('gray.50', 'gray.750')
  return (
    <Card size='sm' width='full' bgColor={bg} mt='15px'>
      <Card.Body p='12px' py='0'>
        <Flex borderRadius='8px' justifyContent='space-between' alignItems='center'>
          <Flex alignItems='center'>
            <Image src={pending} width='40px' height='40px' mr='10px' />
            <Flex direction='column'>
              <Text translation={'defi.unstaking'} fontWeight='semibold' lineHeight='1.2' />
              <Text
                translation={[
                  'defi.available',
                  { unbondingEnd: dayjs().to(dayjs.unix(unbondingEnd)) },
                ]}
                lineHeight='1.2'
                color='gray.500'
              />
            </Flex>
          </Flex>
          <Flex direction='column' alignItems='flex-end'>
            <Amount.Fiat
              fontWeight='medium'
              lineHeight='1.2'
              value={cryptoUnbondedAmount.times(fiatRate).toPrecision()}
            />
            <Amount.Crypto
              color='gray.500'
              lineHeight='1.2'
              value={cryptoUnbondedAmount.toString()}
              symbol={assetSymbol}
            />
          </Flex>
        </Flex>
      </Card.Body>
    </Card>
  )
}
