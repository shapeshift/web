import { BoxProps, SimpleGrid, TextProps } from '@chakra-ui/layout'
import { Skeleton } from '@chakra-ui/skeleton'
import { StatArrow } from '@chakra-ui/stat'
import { AssetId } from '@shapeshiftoss/caip'
import { Amount } from 'components/Amount/Amount'
import { Card } from 'components/Card/Card'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type AssetMarketDataProps = {
  assetId: AssetId
  isLoaded?: boolean
  fallbackMaxSupply?: string
}

type StatProps = TextProps & { isLoaded?: boolean }

const Stat = (props: BoxProps) => (
  <Row
    alignItems='center'
    width='full'
    flexDir={{ base: 'row', md: 'row' }}
    justifyContent={{ base: 'space-between', md: 'space-between' }}
    {...props}
  />
)

const StatLabel = ({ isLoaded, ...rest }: StatProps) => (
  <Skeleton mb={1} isLoaded={isLoaded}>
    <Row.Label lineHeight='1' fontSize={{ base: 'md', md: 'md' }} {...rest} />
  </Skeleton>
)

const StatValue = ({ isLoaded, ...rest }: StatProps) => (
  <Skeleton isLoaded={isLoaded}>
    <Row.Value
      fontSize={{ base: 'md', md: 'md' }}
      fontWeight='semibold'
      display='flex'
      lineHeight='1'
      alignItems='center'
      {...rest}
    />
  </Skeleton>
)

export const AssetMarketData: React.FC<AssetMarketDataProps> = ({ assetId, fallbackMaxSupply }) => {
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const percentChange = bnOrZero(marketData?.changePercent24Hr)
  const isLoaded = !!marketData

  return (
    <Card>
      <Card.Header>
        <Card.Heading>Market Data</Card.Heading>
      </Card.Header>
      <Card.Body>
        <SimpleGrid gridTemplateColumns={{ base: '1fr', md: '1fr' }} gridGap={6} width='full'>
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
              <StatArrow
                fontSize='sm'
                mr={1}
                type={percentChange.gt(0) ? 'increase' : 'decrease'}
              />
              <Amount.Percent value={percentChange.div(100).toNumber() ?? 0} />
            </StatValue>
          </Stat>

          {(marketData?.maxSupply || fallbackMaxSupply) && (
            <Stat>
              <StatLabel isLoaded={isLoaded}>
                <Text translation='assets.assetDetails.assetHeader.maxTotalSupply' />
              </StatLabel>
              <StatValue isLoaded={isLoaded}>
                <Amount.Supply value={marketData?.maxSupply || fallbackMaxSupply || 0} />
              </StatValue>
            </Stat>
          )}
          {marketData?.supply && (
            <Stat>
              <StatLabel isLoaded={isLoaded}>
                <Text translation='assets.assetDetails.assetHeader.availableSupply' />
              </StatLabel>
              <StatValue isLoaded={isLoaded}>
                <Amount.Supply value={marketData?.supply} />
              </StatValue>
            </Stat>
          )}
        </SimpleGrid>
      </Card.Body>
    </Card>
  )
}
