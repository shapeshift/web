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
import { CAIP19 } from '@shapeshiftoss/caip'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { useMemo, useState } from 'react'
import NumberFormat from 'react-number-format'
import { useTranslate } from 'react-polyglot'
import { BalanceChart } from 'components/BalanceChart/BalanceChart'
import { Card } from 'components/Card/Card'
import { TimeControls } from 'components/Graph/TimeControls'
import { PriceChart } from 'components/PriceChart/PriceChart'
import { SanitizedHtml } from 'components/SanitizedHtml/SanitizedHtml'
import { RawText, Text } from 'components/Text'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { useWalletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import {
  selectAssetByCAIP19,
  useGetAssetDescriptionQuery
} from 'state/slices/assetsSlice/assetsSlice'
import { selectMarketDataById } from 'state/slices/marketDataSlice/marketDataSlice'
import {
  AccountSpecifier,
  selectAccountIdsByAssetId,
  selectPortfolioCryptoHumanBalanceByFilter,
  selectPortfolioFiatBalanceByFilter
} from 'state/slices/portfolioSlice/portfolioSlice'
import { useAppSelector } from 'state/store'
import { breakpoints } from 'theme/theme'

import { AssetActions } from './AssetActions'
import { AssetMarketData } from './AssetMarketData'

enum View {
  Price = 'price',
  Balance = 'balance'
}

type AssetHeaderProps = {
  assetId: CAIP19
  accountId?: AccountSpecifier
}

export const AssetHeader: React.FC<AssetHeaderProps> = ({ assetId, accountId }) => {
  const translate = useTranslate()
  const [percentChange, setPercentChange] = useState(0)
  const [timeframe, setTimeframe] = useState(HistoryTimeframe.DAY)
  const [showDescription, setShowDescription] = useState(false)
  const [view, setView] = useState(accountId ? View.Balance : View.Price)
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`)
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetId))
  const chainId = asset.caip2
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const accountIds = useAppSelector(state => selectAccountIdsByAssetId(state, assetId))
  const singleAccount = accountIds && accountIds.length === 1 ? accountIds[0] : undefined
  const isLoaded = !!marketData
  const { name, symbol, description, icon } = asset || {}
  useGetAssetDescriptionQuery(assetId)
  const { price } = marketData || {}
  const {
    number: { toFiat }
  } = useLocaleFormatter({ fiatType: 'USD' })
  const assetPrice = toFiat(price) ?? 0
  const handleToggle = () => setShowDescription(!showDescription)
  const assetIds = useMemo(() => [assetId].filter(Boolean), [assetId])

  const {
    state: { wallet }
  } = useWallet()

  const walletSupportsChain = useWalletSupportsChain({ chainId, wallet })

  const filter = useMemo(() => ({ assetId, accountId }), [assetId, accountId])
  const cryptoBalance = useAppSelector(state =>
    selectPortfolioCryptoHumanBalanceByFilter(state, filter)
  )
  const totalBalance = toFiat(
    useAppSelector(state => selectPortfolioFiatBalanceByFilter(state, filter))
  )

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
        {walletSupportsChain ? (
          <AssetActions
            isLoaded={isLoaded}
            assetId={assetId}
            accountId={accountId ? accountId : singleAccount}
          />
        ) : null}
      </Card.Header>
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
                <Button isActive={view === View.Balance} onClick={() => setView(View.Balance)}>
                  <Text translation='assets.assetDetails.assetHeader.balance' />
                </Button>
                <Button isActive={view === View.Price} onClick={() => setView(View.Price)}>
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
                  value={view === View.Price ? assetPrice : totalBalance}
                  displayType={'text'}
                  thousandSeparator={true}
                  isNumericString={true}
                />
              </Skeleton>
            </Card.Heading>
            <StatGroup>
              <Stat size='sm' display='flex' flex='initial' mr={2}>
                <Skeleton isLoaded={isLoaded}>
                  <StatNumber
                    display='flex'
                    alignItems='center'
                    color={percentChange > 0 ? 'green.500' : 'red.500'}
                  >
                    <StatArrow type={percentChange > 0 ? 'increase' : 'decrease'} />
                    {isFinite(percentChange) && <RawText>{percentChange}%</RawText>}
                  </StatNumber>
                </Skeleton>
              </Stat>
              {view === View.Balance && (
                <Stat size='sm' color='gray.500'>
                  <Skeleton isLoaded={isLoaded}>
                    <StatNumber>{`${cryptoBalance} ${asset.symbol}`}</StatNumber>
                  </Skeleton>
                </Stat>
              )}
            </StatGroup>
          </Box>
        </Box>
      </Card.Body>
      {/* If the Child component call a function update state of Parent Compnent in UseEffect,the Child Component should avaiable on DOM */}
      <Box style={{ display: view === View.Balance ? 'block' : 'none' }}>
        <BalanceChart
          accountId={accountId}
          assetIds={assetIds}
          timeframe={timeframe}
          percentChange={percentChange}
          setPercentChange={setPercentChange}
        />
      </Box>
      <Box style={{ display: view === View.Price ? 'block' : 'none' }}>
        <PriceChart
          assetId={assetId}
          timeframe={timeframe}
          percentChange={percentChange}
          setPercentChange={setPercentChange}
        />
      </Box>
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
        <AssetMarketData marketData={marketData} isLoaded={!!marketData} />
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
