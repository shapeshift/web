import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Image,
  SkeletonCircle,
  Stat,
  StatArrow,
  StatGroup,
  StatLabel,
  StatNumber
} from '@chakra-ui/react'
import { AssetMarketData, HistoryTimeframe } from '@shapeshiftoss/market-service'
import { Card } from 'components/Card/Card'
import { Graph } from 'components/Graph/Graph'
import { TimeControls } from 'components/Graph/TimeControls'
import { RawText, Text } from 'components/Text'
import numeral from 'numeral'
import { useState } from 'react'
import NumberFormat from 'react-number-format'
import { useTranslate } from 'react-polyglot'

import { AssetActions } from './AssetActions'

export const AssetHeader = ({ asset }: { asset: AssetMarketData }) => {
  const { name, symbol, description, icon, changePercent24Hr, price, marketCap, volume } = asset
  const percentChange = changePercent24Hr ?? 0
  const assetPrice = price ?? 0
  const [timeframe, setTimeframe] = useState(HistoryTimeframe.YEAR)
  const [graphPercentChange, setGraphPercentChange] = useState(percentChange)
  const translate = useTranslate()

  return (
    <Card variant='footer-stub'>
      <Card.Header display='flex' alignItems='center' flexDir={{ base: 'column', lg: 'row' }}>
        <Flex alignItems='center' mr='auto'>
          <Image
            src={icon}
            boxSize='60px'
            fallback={<SkeletonCircle boxSize='60px' />}
            my={{ base: 4, lg: 0 }}
          />
          <Box ml={3} textAlign='left'>
            <Heading fontSize='2xl'>{name}</Heading>
            <RawText fontSize='lg' color='gray.500' textTransform='uppercase' lineHeight={1}>
              {symbol}
            </RawText>
          </Box>
        </Flex>
        <AssetActions asset={asset} />
      </Card.Header>
      <Card.Body>
        <Box>
          <Flex justifyContent='space-between' width='full' flexDir={{ base: 'column', md: 'row' }}>
            <HStack>
              <Button size='sm' colorScheme='blue' variant='ghost'>
                <Text translation='assets.assetDetails.assetHeader.balance' />
              </Button>
              <Button size='sm' colorScheme='blue' variant='ghost' isActive={true}>
                <Text translation='assets.assetDetails.assetHeader.price' />
              </Button>
            </HStack>
            <TimeControls onChange={setTimeframe} defaultTime={timeframe} />
          </Flex>
          <Box width='full' alignItems='center' display='flex' flexDir='column' mt={6}>
            <Card.Heading fontSize='4xl'>
              <NumberFormat
                value={assetPrice}
                displayType={'text'}
                thousandSeparator={true}
                prefix={'$'}
              />
            </Card.Heading>
            <StatGroup>
              <Stat size='sm' display='flex' flex='initial' mr={2}>
                <StatNumber
                  display='flex'
                  alignItems='center'
                  color={graphPercentChange > 0 ? 'green.500' : 'red.500'}
                >
                  <StatArrow type={graphPercentChange > 0 ? 'increase' : 'decrease'} />
                  <RawText>{graphPercentChange.toFixed(2)}%</RawText>
                </StatNumber>
              </Stat>
              <Stat size='sm' color='gray.500'>
                <StatNumber>0.0005 BTC</StatNumber>
              </Stat>
            </StatGroup>
          </Box>
        </Box>
      </Card.Body>
      <Card.Body px={0} py={0} position='relative' height='300px'>
        <Graph asset={asset} timeframe={timeframe} setPercentChange={setGraphPercentChange} />
      </Card.Body>
      <Card.Footer>
        <StatGroup>
          <Stat textAlign='center'>
            <StatLabel color='gray.500'>Price</StatLabel>
            <StatNumber>
              <NumberFormat
                value={assetPrice}
                displayType={'text'}
                thousandSeparator={true}
                prefix={'$'}
              />
            </StatNumber>
          </Stat>
          <Stat textAlign='center'>
            <StatLabel color='gray.500'>Market Cap</StatLabel>
            <StatNumber>{numeral(marketCap).format(`($0.00a)`)}</StatNumber>
          </Stat>
          <Stat textAlign='center'>
            <StatLabel color='gray.500'>24hr Volume</StatLabel>
            <StatNumber>{numeral(volume).format(`($0.00a)`)}</StatNumber>
          </Stat>
          <Stat textAlign='center'>
            <StatLabel color='gray.500'>Day Change</StatLabel>
            <StatNumber display='flex' alignItems='center' justifyContent='center'>
              <StatArrow type={percentChange > 0 ? 'increase' : 'decrease'} />
              <RawText>{percentChange.toFixed(2)}%</RawText>
            </StatNumber>
          </Stat>
        </StatGroup>
      </Card.Footer>
      {description && (
        <Card.Footer>
          <Card.Heading mb={4}>
            {translate('assets.assetDetails.assetHeader.aboutAsset', { asset: name })}
          </Card.Heading>
          <RawText color='gray.500'>{description}</RawText>
        </Card.Footer>
      )}
    </Card>
  )
}
