import { BoxProps, SimpleGrid, TextProps } from '@chakra-ui/layout'
import { Skeleton } from '@chakra-ui/skeleton'
import { StatArrow } from '@chakra-ui/stat'
import { Amount } from 'components/Amount/Amount'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'

type AssetMarketDataProps = {
  marketData: {
    price?: number | string
    marketCap?: number | string
    volume?: number | string
    changePercent24Hr?: number | string
  }
  isLoaded?: boolean
}

type StatProps = TextProps & { isLoaded?: boolean }

const Stat = (props: BoxProps) => (
  <Row
    alignItems='center'
    width='full'
    flexDir={{ base: 'row', md: 'column' }}
    justifyContent={{ base: 'space-between', md: 'center' }}
    {...props}
  />
)

const StatLabel = ({ isLoaded, ...rest }: StatProps) => (
  <Skeleton mb={1} isLoaded={isLoaded}>
    <Row.Label lineHeight='1' fontSize={{ base: 'md', md: 'sm' }} {...rest} />
  </Skeleton>
)

const StatValue = ({ isLoaded, ...rest }: StatProps) => (
  <Skeleton isLoaded={isLoaded}>
    <Row.Value
      fontSize={{ base: 'md', md: '2xl' }}
      fontWeight='semibold'
      display='flex'
      lineHeight='1'
      alignItems='center'
      {...rest}
    />
  </Skeleton>
)

export const AssetMarketData = ({ marketData, isLoaded }: AssetMarketDataProps) => {
  const percentChange = bnOrZero(marketData?.changePercent24Hr)
  return (
    <SimpleGrid
      gridTemplateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }}
      gridGap={6}
      width='full'
    >
      <Stat>
        <StatLabel isLoaded={isLoaded}>
          <Text translation='assets.assetDetails.assetHeader.price' />
        </StatLabel>
        <StatValue isLoaded={isLoaded}>
          <Amount.Fiat value={marketData?.price || 0} />
        </StatValue>
      </Stat>
      <Stat>
        <StatLabel isLoaded={isLoaded}>
          <Text translation='assets.assetDetails.assetHeader.marketCap' />
        </StatLabel>
        <StatValue isLoaded={isLoaded}>
          <Amount.Fiat value={marketData?.marketCap || 0} />
        </StatValue>
      </Stat>
      <Stat>
        <StatLabel isLoaded={isLoaded}>
          <Text translation='assets.assetDetails.assetHeader.24HrVolume' />
        </StatLabel>
        <StatValue isLoaded={isLoaded}>
          <Amount.Fiat value={marketData?.volume || 0} />
        </StatValue>
      </Stat>
      <Stat>
        <StatLabel isLoaded={isLoaded}>
          <Text translation='assets.assetDetails.assetHeader.dayChange' />
        </StatLabel>
        <StatValue isLoaded={isLoaded}>
          <StatArrow fontSize='sm' mr={1} type={percentChange.gt(0) ? 'increase' : 'decrease'} />
          <Amount.Percent value={percentChange.div(100).toNumber() ?? 0} />
        </StatValue>
      </Stat>
    </SimpleGrid>
  )
}
