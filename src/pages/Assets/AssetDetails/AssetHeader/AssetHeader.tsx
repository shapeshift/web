import {
  Box,
  Button,
  ButtonGroup,
  Collapse,
  Flex,
  Heading,
  Image,
  Skeleton,
  SkeletonCircle,
  SkeletonText,
  Stat,
  StatArrow,
  StatGroup,
  StatNumber,
  useMediaQuery
} from '@chakra-ui/react'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { isEmpty } from 'lodash'
import { useMemo, useState } from 'react'
import NumberFormat from 'react-number-format'
import { useTranslate } from 'react-polyglot'
import { Card } from 'components/Card/Card'
import { Graph } from 'components/Graph/Graph'
import { TimeControls } from 'components/Graph/TimeControls'
import { SanitizedHtml } from 'components/SanitizedHtml/SanitizedHtml'
import { RawText, Text } from 'components/Text'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useBalanceChartData } from 'hooks/useBalanceChartData/useBalanceChartData'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { useWalletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { useAsset } from 'pages/Assets/Asset'
import { usePriceHistory } from 'pages/Assets/hooks/usePriceHistory/usePriceHistory'
import { selectMarketAssetPercentChangeById } from 'state/slices/marketDataSlice/marketDataSlice'
import {
  selectPortfolioCryptoHumanBalanceById,
  selectPortfolioFiatBalanceById
} from 'state/slices/portfolioSlice/portfolioSlice'
import { useAppSelector } from 'state/store'
import { breakpoints } from 'theme/theme'

import { AssetActions } from './AssetActions'
import { AssetMarketData } from './AssetMarketData'
import { SegwitSelectCard } from './SegwitSelectCard'

enum Views {
  Price = 'price',
  Balance = 'balance'
}

export const AssetHeader = ({ isLoaded }: { isLoaded: boolean }) => {
  const { asset, marketData } = useAsset()
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`)
  const [view, setView] = useState(Views.Price)
  const { name, symbol, description, icon } = asset || {}
  const { price } = marketData || {}
  const {
    number: { toFiat }
  } = useLocaleFormatter({ fiatType: 'USD' })
  const assetPrice = toFiat(price) ?? 0
  const [timeframe, setTimeframe] = useState(HistoryTimeframe.DAY)
  const translate = useTranslate()
  const [showDescription, setShowDescription] = useState(false)
  const handleToggle = () => setShowDescription(!showDescription)
  const assets = useMemo(() => [asset.caip19].filter(Boolean), [asset])
  const { data: priceHistoryData, loading: priceHistoryDataLoading } = usePriceHistory({
    assets,
    timeframe
  })
  const {
    state: { wallet }
  } = useWallet()

  const walletSupportsChain = useWalletSupportsChain({ asset, wallet })

  const assetPriceHistoryData = useMemo(() => {
    if (isEmpty(priceHistoryData[asset?.caip19])) return []
    return priceHistoryData[asset.caip19].map(({ price, date }) => ({
      price,
      date: new Date(Number(date)).toISOString()
    }))
  }, [priceHistoryData, asset])

  const graphPercentChange = useAppSelector(state =>
    selectMarketAssetPercentChangeById(state, { assetId: asset.caip19, timeframe })
  )
  const cryptoBalance = useAppSelector(state =>
    selectPortfolioCryptoHumanBalanceById(state, asset.caip19)
  )
  const totalBalance = useAppSelector(state => selectPortfolioFiatBalanceById(state, asset.caip19))
  // TODO(0xdef1cafe): use the balance chart component here
  const { balanceChartData, balanceChartDataLoading } = useBalanceChartData({
    assets,
    timeframe
  })

  const graphData = view === Views.Balance ? balanceChartData : assetPriceHistoryData
  const graphLoading = view === Views.Balance ? balanceChartDataLoading : priceHistoryDataLoading
  const graphColor = graphPercentChange > 0 ? 'green.500' : 'red.500'

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
        {walletSupportsChain ? <AssetActions isLoaded={isLoaded} /> : null}
      </Card.Header>
      {walletSupportsChain ? <SegwitSelectCard chain={asset.chain} /> : null}
      <Card.Body>
        <Box>
          <Flex
            justifyContent={{ base: 'center', md: 'space-between' }}
            width='full'
            flexDir={{ base: 'column', md: 'row' }}
          >
            <Skeleton isLoaded={isLoaded} textAlign='center'>
              <ButtonGroup
                hidden={!walletSupportsChain}
                size='sm'
                colorScheme='blue'
                variant='ghost'
              >
                <Button isActive={view === Views.Balance} onClick={() => setView(Views.Balance)}>
                  <Text translation='assets.assetDetails.assetHeader.balance' />
                </Button>
                <Button isActive={view === Views.Price} onClick={() => setView(Views.Price)}>
                  <Text translation='assets.assetDetails.assetHeader.price' />
                </Button>
              </ButtonGroup>
            </Skeleton>
            {isLargerThanMd && (
              <Skeleton isLoaded={isLoaded}>
                <TimeControls onChange={setTimeframe} defaultTime={timeframe} />
              </Skeleton>
            )}
          </Flex>
          <Box width='full' alignItems='center' display='flex' flexDir='column' mt={6}>
            <Card.Heading fontSize='4xl' lineHeight={1} mb={2}>
              <Skeleton isLoaded={isLoaded}>
                <NumberFormat
                  value={view === Views.Price ? assetPrice : totalBalance}
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
                    <RawText>{graphPercentChange}%</RawText>
                  </StatNumber>
                </Skeleton>
              </Stat>
              {view === Views.Balance && (
                <Stat size='sm' color='gray.500'>
                  <Skeleton isLoaded={isLoaded}>
                    <StatNumber>{`${cryptoBalance}${asset.symbol}`}</StatNumber>
                  </Skeleton>
                </Stat>
              )}
            </StatGroup>
          </Box>
        </Box>
      </Card.Body>
      <Card.Body px={0} py={0} position='relative' height='300px'>
        <Graph
          data={graphData}
          loading={graphLoading}
          isLoaded={!graphLoading}
          color={graphColor}
        />
      </Card.Body>
      {!isLargerThanMd && (
        <Skeleton isLoaded={isLoaded} textAlign='center'>
          <TimeControls
            onChange={setTimeframe}
            defaultTime={timeframe}
            buttonGroupProps={{ display: 'flex', justifyContent: 'space-between', px: 6, py: 4 }}
          />
        </Skeleton>
      )}
      <Card.Footer>
        <AssetMarketData marketData={marketData} isLoaded={isLoaded} />
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
