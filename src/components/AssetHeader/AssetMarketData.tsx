import type { BoxProps, TextProps } from '@chakra-ui/layout'
import { SimpleGrid } from '@chakra-ui/layout'
import { Skeleton } from '@chakra-ui/skeleton'
import { Stat, StatArrow } from '@chakra-ui/stat'
import type { AssetId } from '@keepkey/caip'
import { useTranslate } from 'react-polyglot'
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
}

type StatProps = TextProps & { isLoaded?: boolean }

const StatRow = (props: BoxProps) => (
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

export const AssetMarketData: React.FC<AssetMarketDataProps> = ({ assetId }) => {
  const translate = useTranslate()
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const percentChange = bnOrZero(marketData?.changePercent24Hr)
  const isLoaded = !!marketData

  return (
    <Card>
      <Card.Header>
        <Card.Heading>{translate('assets.assetDetails.assetHeader.marketData')}</Card.Heading>
      </Card.Header>
      <Card.Body>
        <SimpleGrid gridTemplateColumns={{ base: '1fr', md: '1fr' }} gridGap={6} width='full'>
          <StatRow>
            <StatLabel isLoaded={isLoaded}>
              <Text translation='assets.assetDetails.assetHeader.price' />
            </StatLabel>
            <StatValue isLoaded={isLoaded}>
              <Amount.Fiat value={marketData?.price ?? 0} />
            </StatValue>
          </StatRow>
          <StatRow>
            <StatLabel isLoaded={isLoaded}>
              <Text translation='assets.assetDetails.assetHeader.marketCap' />
            </StatLabel>
            <StatValue isLoaded={isLoaded}>
              <Amount.Fiat value={marketData?.marketCap ?? 0} />
            </StatValue>
          </StatRow>
          <StatRow>
            <StatLabel isLoaded={isLoaded}>
              <Text translation='assets.assetDetails.assetHeader.24HrVolume' />
            </StatLabel>
            <StatValue isLoaded={isLoaded}>
              <Amount.Fiat value={marketData?.volume ?? 0} />
            </StatValue>
          </StatRow>
          <StatRow>
            <StatLabel isLoaded={isLoaded}>
              <Text translation='assets.assetDetails.assetHeader.dayChange' />
            </StatLabel>
            <StatValue isLoaded={isLoaded}>
              <Stat>
                <StatArrow
                  fontSize='sm'
                  mr={1}
                  type={percentChange.gt(0) ? 'increase' : 'decrease'}
                />
              </Stat>
              <Amount.Percent value={percentChange.div(100).toNumber() ?? 0} />
            </StatValue>
          </StatRow>

          {marketData?.maxSupply && (
            <StatRow>
              <StatLabel isLoaded={isLoaded}>
                <Text translation='assets.assetDetails.assetHeader.maxTotalSupply' />
              </StatLabel>
              <StatValue isLoaded={isLoaded}>
                <Amount value={marketData?.maxSupply ?? 0} abbreviated omitDecimalTrailingZeros />
              </StatValue>
            </StatRow>
          )}
          {marketData?.supply && (
            <StatRow>
              <StatLabel isLoaded={isLoaded}>
                <Text translation='assets.assetDetails.assetHeader.availableSupply' />
              </StatLabel>
              <StatValue isLoaded={isLoaded}>
                <Amount
                  value={Math.round(Number(marketData?.supply ?? 0))}
                  abbreviated
                  omitDecimalTrailingZeros
                />
              </StatValue>
            </StatRow>
          )}
        </SimpleGrid>
      </Card.Body>
    </Card>
  )
}
