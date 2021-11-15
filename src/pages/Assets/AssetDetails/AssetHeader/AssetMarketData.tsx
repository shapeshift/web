import { BoxProps, SimpleGrid, TextProps } from '@chakra-ui/layout'
import { Skeleton } from '@chakra-ui/skeleton'
import { StatArrow } from '@chakra-ui/stat'
import { Amount } from 'components/Amount/Amount'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'

type AssetMarketDataProps = {
  marketData: {
    price?: number
    marketCap?: number
    volume?: number
    changePercent24Hr?: number
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

const StatLabel = (props: StatProps) => (
  <Skeleton mb={1} isLoaded={props?.isLoaded}>
    <Row.Label lineHeight='1' {...props} />
  </Skeleton>
)

const StatValue = (props: StatProps) => (
  <Skeleton isLoaded={props?.isLoaded}>
    <Row.Value
      fontSize={{ base: 'md', md: '2xl' }}
      fontWeight='semibold'
      display='flex'
      lineHeight='1'
      alignItems='center'
      {...props}
    />
  </Skeleton>
)

export const AssetMarketData = ({ marketData, isLoaded }: AssetMarketDataProps) => {
  const percentChange = marketData?.changePercent24Hr || 0
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
          <StatArrow fontSize='sm' mr={1} type={percentChange > 0 ? 'increase' : 'decrease'} />
          <Amount.Percent value={percentChange / 100 ?? 0} />
        </StatValue>
      </Stat>
    </SimpleGrid>
  )
}
