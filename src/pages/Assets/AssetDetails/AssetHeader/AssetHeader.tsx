import {
  Box,
  Button,
  ButtonGroup,
  Collapse,
  Flex,
  Heading,
  HStack,
  Image,
  Skeleton,
  SkeletonCircle,
  SkeletonText,
  Stat,
  StatArrow,
  StatGroup,
  StatLabel,
  StatNumber
} from '@chakra-ui/react'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import numeral from 'numeral'
import { useState } from 'react'
import NumberFormat from 'react-number-format'
import { useTranslate } from 'react-polyglot'
import { useParams } from 'react-router-dom'
import { Card } from 'components/Card/Card'
import { Graph } from 'components/Graph/Graph'
import { TimeControls } from 'components/Graph/TimeControls'
import { SanitizedHtml } from 'components/SanitizedHtml/SanitizedHtml'
import { RawText, Text } from 'components/Text'
import { AssetMarketData } from 'hooks/useAsset/useAsset'
import { useFlattenedBalances } from 'hooks/useBalances/useFlattenedBalances'
import { fromBaseUnit } from 'lib/math'
import { MatchParams } from 'pages/Assets/Asset'
import { usePercentChange } from 'pages/Assets/hooks/usePercentChange/usePercentChange'
import { usePriceHistory } from 'pages/Assets/hooks/usePriceHistory/usePriceHistory'
import { useTotalBalance } from 'pages/Dashboard/hooks/useTotalBalance/useTotalBalance'

import { AssetActions } from './AssetActions'
import { SegwitSelectCard } from './SegwitSelectCard'

enum views {
  price = 'price',
  balance = 'balance'
}

export const AssetHeader = ({ asset, isLoaded }: { asset: AssetMarketData; isLoaded: boolean }) => {
  const { chain, tokenId } = useParams<MatchParams>()
  const [view, setView] = useState(views.price)
  const { name, symbol, description, icon, changePercent24Hr, price, marketCap, volume } = asset
  const percentChange = changePercent24Hr ?? 0
  const assetPrice = price ?? 0
  const [timeframe, setTimeframe] = useState(HistoryTimeframe.YEAR)
  const translate = useTranslate()
  const [showDescription, setShowDescription] = useState(false)
  const handleToggle = () => setShowDescription(!showDescription)
  const { data, loading } = usePriceHistory({
    asset,
    timeframe
  })
  const graphPercentChange = usePercentChange({ data, initPercentChange: percentChange })
  const { balances } = useFlattenedBalances()
  const id = tokenId ?? chain
  const totalBalance = useTotalBalance({ [id]: balances[id] })

  return (
    <Card variant='footer-stub'>
      <Card.Header display='flex' alignItems='center' flexDir={{ base: 'column', lg: 'row' }}>
        <Flex alignItems='center' mr='auto'>
          <SkeletonCircle boxSize='60px' isLoaded={isLoaded}>
            <Image src={icon} boxSize='60px' fallback={<SkeletonCircle boxSize='60px' />} />
          </SkeletonCircle>
          <Box ml={3} textAlign='left'>
            <Skeleton isLoaded={isLoaded}>
              <Heading fontSize='2xl' mb={1} lineHeight={1}>
                {name}
              </Heading>
            </Skeleton>
            <Skeleton isLoaded={isLoaded}>
              <RawText fontSize='lg' color='gray.500' textTransform='uppercase' lineHeight={1}>
                {symbol}
              </RawText>
            </Skeleton>
          </Box>
        </Flex>
        <AssetActions asset={asset} isLoaded={isLoaded} />
      </Card.Header>
      <SegwitSelectCard chain={chain} />
      <Card.Body>
        <Box>
          <Flex justifyContent='space-between' width='full' flexDir={{ base: 'column', md: 'row' }}>
            <Skeleton isLoaded={isLoaded}>
              <ButtonGroup size='sm' colorScheme='blue' variant='ghost'>
                <Button isActive={view === views.balance} onClick={() => setView(views.balance)}>
                  <Text translation='assets.assetDetails.assetHeader.balance' />
                </Button>
                <Button isActive={view === views.price} onClick={() => setView(views.price)}>
                  <Text translation='assets.assetDetails.assetHeader.price' />
                </Button>
              </ButtonGroup>
            </Skeleton>
            <Skeleton isLoaded={isLoaded}>
              <TimeControls onChange={setTimeframe} defaultTime={timeframe} />
            </Skeleton>
          </Flex>
          <Box width='full' alignItems='center' display='flex' flexDir='column' mt={6}>
            <Card.Heading fontSize='4xl' lineHeight={1} mb={2}>
              <Skeleton isLoaded={isLoaded}>
                <NumberFormat
                  value={view === views.price ? assetPrice : totalBalance}
                  displayType={'text'}
                  thousandSeparator={true}
                  prefix={'$'}
                />
              </Skeleton>
            </Card.Heading>
            <StatGroup>
              <Stat size='sm' display='flex' flex='initial' mr={2}>
                <Skeleton isLoaded={isLoaded}>
                  <StatNumber
                    display='flex'
                    alignItems='center'
                    color={graphPercentChange > 0 ? 'green.500' : 'red.500'}
                  >
                    <StatArrow type={graphPercentChange > 0 ? 'increase' : 'decrease'} />
                    <RawText>{graphPercentChange.toFixed(2)}%</RawText>
                  </StatNumber>
                </Skeleton>
              </Stat>
              {view === views.balance && (
                <Stat size='sm' color='gray.500'>
                  <Skeleton isLoaded={isLoaded}>
                    <StatNumber>
                      {`${fromBaseUnit(balances[id]?.balance ?? '0', asset.precision)}${
                        asset.symbol
                      }`}
                    </StatNumber>
                  </Skeleton>
                </Stat>
              )}
            </StatGroup>
          </Box>
        </Box>
      </Card.Body>
      <Card.Body px={0} py={0} position='relative' height='300px'>
        <Graph data={data} loading={loading} isLoaded={isLoaded} />
      </Card.Body>
      <Card.Footer>
        <HStack>
          <Stat textAlign='center'>
            <Skeleton isLoaded={isLoaded} variant='center' size='sm'>
              <StatLabel color='gray.500'>Price</StatLabel>
            </Skeleton>
            <StatNumber>
              <Skeleton isLoaded={isLoaded} variant='inline'>
                <NumberFormat
                  value={assetPrice}
                  displayType={'text'}
                  thousandSeparator={true}
                  prefix={'$'}
                />
              </Skeleton>
            </StatNumber>
          </Stat>
          <Stat textAlign='center'>
            <Skeleton isLoaded={isLoaded} variant='center' size='sm'>
              <StatLabel color='gray.500'>Market Cap</StatLabel>
            </Skeleton>
            <StatNumber>
              <Skeleton isLoaded={isLoaded} variant='inline'>
                {numeral(marketCap).format(`($0.00a)`)}
              </Skeleton>
            </StatNumber>
          </Stat>
          <Stat textAlign='center'>
            <Skeleton isLoaded={isLoaded} variant='center' size='sm'>
              <StatLabel color='gray.500'>24hr Volume</StatLabel>
            </Skeleton>
            <StatNumber>
              <Skeleton isLoaded={isLoaded} variant='inline'>
                {numeral(volume).format(`($0.00a)`)}
              </Skeleton>
            </StatNumber>
          </Stat>
          <Stat textAlign='center'>
            <StatLabel color='gray.500'>
              <Skeleton isLoaded={isLoaded} variant='center' size='sm'>
                Day Change
              </Skeleton>
            </StatLabel>
            <Skeleton isLoaded={isLoaded} variant='inline'>
              <StatNumber display='flex' alignItems='center' justifyContent='center'>
                <StatArrow type={percentChange > 0 ? 'increase' : 'decrease'} />
                <RawText>{percentChange.toFixed(2)}%</RawText>
              </StatNumber>
            </Skeleton>
          </Stat>
        </HStack>
      </Card.Footer>
      {description && (
        <Card.Footer>
          <Skeleton isLoaded={isLoaded} size='md'>
            <Card.Heading mb={4}>
              {translate('assets.assetDetails.assetHeader.aboutAsset', { asset: name })}
            </Card.Heading>
          </Skeleton>

          <Collapse startingHeight={70} in={showDescription}>
            <SkeletonText isLoaded={isLoaded} noOfLines={4} spacing={2} skeletonHeight='20px'>
              <SanitizedHtml color='gray.500' dirtyHtml={description} />
            </SkeletonText>
          </Collapse>
          <Button size='sm' onClick={handleToggle} mt='1rem'>
            {showDescription
              ? translate('assets.assetDetails.assetDescription.showLess')
              : translate('assets.assetDetails.assetDescription.showMore')}
          </Button>
        </Card.Footer>
      )}
    </Card>
  )
}
