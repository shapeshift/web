import type { BoxProps, ResponsiveValue, TextProps } from '@chakra-ui/react'
import {
  Card,
  CardBody,
  CardHeader,
  Heading,
  SimpleGrid,
  Skeleton,
  Stat,
  StatArrow,
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import type { Property } from 'csstype'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectMarketDataByAssetIdUserCurrency } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type AssetMarketDataProps = {
  assetId: AssetId
  isLoaded?: boolean
}

type StatProps = TextProps & { isLoaded?: boolean }

const statRowFlexDir: ResponsiveValue<Property.FlexDirection> = { base: 'row', md: 'row' }
const statRowJustifyContent = { base: 'space-between', md: 'space-between' }
const simpleGridTemplateColumns = { base: '1fr', md: '1fr' }

const StatRow = (props: BoxProps) => (
  <Row
    alignItems='center'
    width='full'
    flexDir={statRowFlexDir}
    justifyContent={statRowJustifyContent}
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
  const marketData = useAppSelector(state => selectMarketDataByAssetIdUserCurrency(state, assetId))
  const percentChange = bnOrZero(marketData?.changePercent24Hr)
  const isLoaded = !!marketData

  return (
    <Card variant='dashboard'>
      <CardHeader>
        <Heading as='h5'>{translate('assets.assetDetails.assetHeader.marketData')}</Heading>
      </CardHeader>
      <CardBody>
        <SimpleGrid gridTemplateColumns={simpleGridTemplateColumns} gridGap={6} width='full'>
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
                <Amount value={marketData?.supply} abbreviated omitDecimalTrailingZeros />
              </StatValue>
            </StatRow>
          )}
        </SimpleGrid>
      </CardBody>
    </Card>
  )
}
