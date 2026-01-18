import { Box, Grid, GridItem, Heading, useColorModeValue, VStack } from '@chakra-ui/react'
import { memo, useCallback, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { Main } from '@/components/Layout/Main'
import { SEO } from '@/components/Layout/Seo'
import { placeOrder } from '@/lib/hyperliquid/client'
import { OrderSide, OrderType, TimeInForce } from '@/lib/hyperliquid/types'
import { buildLimitOrderType, buildOrderRequest } from '@/lib/hyperliquid/utils'
import {
  AccountInfo,
  MarketSelector,
  Orderbook,
  PerpsChart,
  PositionsList,
  TradeForm,
} from '@/pages/Perps/components'
import { useHyperliquid, useMarkets, useOrderbook, usePositions } from '@/pages/Perps/hooks'
import { PerpsOrderSubmissionState, perpsSlice } from '@/state/slices/perpsSlice'
import {
  selectOrderFormPostOnly,
  selectOrderFormPrice,
  selectOrderFormReduceOnly,
  selectOrderFormSide,
  selectOrderFormSize,
  selectOrderFormType,
} from '@/state/slices/perpsSlice/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'

const mainMaxWidth = { base: 'full', xl: '100%', '2xl': '1800px' }
const mainPadding = { base: 4, md: 6 }

const gridTemplateColumns = {
  base: '1fr',
  lg: '1fr 380px',
  xl: '280px 1fr 380px',
}

const gridTemplateRows = {
  base: 'auto auto auto auto auto',
  lg: 'auto 1fr auto',
  xl: 'auto 1fr auto',
}

const chartHeight = { base: 300, md: 400 }

export const Perps = memo(() => {
  const translate = useTranslate()
  const dispatch = useAppDispatch()
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  const bgColor = useColorModeValue('white', 'gray.800')

  const { isWalletConnected, walletAddress, connectWallet, fetchAccountData } = useHyperliquid()

  const {
    markets,
    filteredMarkets,
    selectedMarket,
    isLoading: isMarketsLoading,
    searchQuery,
    sortBy,
    setSearchQuery,
    setSortBy,
    selectMarket,
  } = useMarkets()

  const selectedCoin = useMemo(() => selectedMarket?.coin ?? null, [selectedMarket])

  const {
    orderbook,
    isLoading: isOrderbookLoading,
    error: orderbookError,
  } = useOrderbook({ coin: selectedCoin })

  const {
    positions,
    isLoading: isPositionsLoading,
    error: positionsError,
    closePosition,
  } = usePositions({
    userAddress: walletAddress,
    autoFetch: isWalletConnected,
    autoSubscribe: isWalletConnected,
    pollingInterval: 0,
  })

  const orderFormType = useAppSelector(selectOrderFormType)
  const orderFormSide = useAppSelector(selectOrderFormSide)
  const orderFormPrice = useAppSelector(selectOrderFormPrice)
  const orderFormSize = useAppSelector(selectOrderFormSize)
  const orderFormReduceOnly = useAppSelector(selectOrderFormReduceOnly)
  const orderFormPostOnly = useAppSelector(selectOrderFormPostOnly)

  useEffect(() => {
    if (isWalletConnected && walletAddress) {
      fetchAccountData()
    }
  }, [isWalletConnected, walletAddress, fetchAccountData])

  const handleInitializeWallet = useCallback(async () => {
    await connectWallet()
  }, [connectWallet])

  const handlePriceClick = useCallback(
    (price: string) => {
      dispatch(perpsSlice.actions.setOrderFormPrice(price))
    },
    [dispatch],
  )

  const handleSizeClick = useCallback(
    (size: string) => {
      dispatch(perpsSlice.actions.setOrderFormSize(size))
    },
    [dispatch],
  )

  const handleClosePosition = useCallback(
    async (coin: string) => {
      const market = markets.find(m => m.coin === coin)
      if (!market) return
      await closePosition(coin, market.assetIndex)
    },
    [markets, closePosition],
  )

  const handleSubmitOrder = useCallback(async () => {
    if (!selectedMarket || !orderFormSize) return

    const assetIndex = selectedMarket.assetIndex
    const isBuy = orderFormSide === OrderSide.Buy
    const price =
      orderFormType === OrderType.Market ? (isBuy ? '9999999' : '0.00001') : orderFormPrice

    if (!price) return

    dispatch(perpsSlice.actions.setOrderSubmissionState(PerpsOrderSubmissionState.Signing))

    try {
      const orderRequest = buildOrderRequest({
        assetIndex,
        isBuy,
        price,
        size: orderFormSize,
        reduceOnly: orderFormReduceOnly,
        orderType: buildLimitOrderType(
          orderFormPostOnly ? TimeInForce.AllOrNone : TimeInForce.GoodTilCanceled,
        ),
      })

      dispatch(perpsSlice.actions.setOrderSubmissionState(PerpsOrderSubmissionState.Submitting))

      const response = await placeOrder({
        orders: [orderRequest],
        grouping: 'na',
      })

      if (response.status === 'err') {
        throw new Error('Order placement failed')
      }

      const orderStatus = response.response?.data?.statuses?.[0]
      if (orderStatus?.error) {
        throw new Error(orderStatus.error)
      }

      dispatch(perpsSlice.actions.setOrderSubmissionState(PerpsOrderSubmissionState.Complete))
      dispatch(perpsSlice.actions.resetOrderForm())

      if (walletAddress) {
        fetchAccountData()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Order placement failed'
      dispatch(perpsSlice.actions.setOrderSubmissionState(PerpsOrderSubmissionState.Failed))
      dispatch(perpsSlice.actions.setOrderSubmissionError(errorMessage))
    }
  }, [
    selectedMarket,
    orderFormSide,
    orderFormType,
    orderFormPrice,
    orderFormSize,
    orderFormReduceOnly,
    orderFormPostOnly,
    walletAddress,
    fetchAccountData,
    dispatch,
  ])

  const marketSelectorElement = useMemo(
    () => (
      <MarketSelector
        selectedMarket={selectedMarket}
        markets={markets}
        filteredMarkets={filteredMarkets}
        isLoading={isMarketsLoading}
        searchQuery={searchQuery}
        sortBy={sortBy}
        onSearchChange={setSearchQuery}
        onSortChange={setSortBy}
        onMarketSelect={selectMarket}
      />
    ),
    [
      selectedMarket,
      markets,
      filteredMarkets,
      isMarketsLoading,
      searchQuery,
      sortBy,
      setSearchQuery,
      setSortBy,
      selectMarket,
    ],
  )

  const chartElement = useMemo(
    () => <PerpsChart coin={selectedCoin} height={chartHeight.md} />,
    [selectedCoin],
  )

  const orderbookElement = useMemo(
    () => (
      <Orderbook
        orderbook={orderbook}
        isLoading={isOrderbookLoading}
        error={orderbookError}
        onPriceClick={handlePriceClick}
        onSizeClick={handleSizeClick}
      />
    ),
    [orderbook, isOrderbookLoading, orderbookError, handlePriceClick, handleSizeClick],
  )

  const tradeFormElement = useMemo(
    () => (
      <TradeForm
        selectedMarket={selectedMarket}
        isLoading={isMarketsLoading}
        isWalletConnected={isWalletConnected}
        onSubmitOrder={handleSubmitOrder}
      />
    ),
    [selectedMarket, isMarketsLoading, isWalletConnected, handleSubmitOrder],
  )

  const accountInfoElement = useMemo(
    () => (
      <AccountInfo
        isWalletConnected={isWalletConnected}
        onInitializeWallet={handleInitializeWallet}
      />
    ),
    [isWalletConnected, handleInitializeWallet],
  )

  const positionsListElement = useMemo(
    () => (
      <PositionsList
        positions={positions}
        isLoading={isPositionsLoading}
        error={positionsError}
        onClosePosition={handleClosePosition}
      />
    ),
    [positions, isPositionsLoading, positionsError, handleClosePosition],
  )

  return (
    <Main px={mainPadding} maxWidth={mainMaxWidth}>
      <SEO title={translate('navBar.perps')} />
      <Grid
        templateColumns={gridTemplateColumns}
        templateRows={gridTemplateRows}
        gap={4}
        width='full'
      >
        <GridItem display={{ base: 'block', xl: 'none' }} colSpan={{ base: 1, lg: 2 }}>
          <Box bg={bgColor} borderRadius='lg' borderWidth='1px' borderColor={borderColor} p={4}>
            {marketSelectorElement}
          </Box>
        </GridItem>

        <GridItem display={{ base: 'none', xl: 'flex' }} rowSpan={3}>
          <VStack spacing={4} width='full' align='stretch'>
            <Box bg={bgColor} borderRadius='lg' borderWidth='1px' borderColor={borderColor} p={4}>
              <VStack spacing={4} align='stretch'>
                <Heading size='sm'>{translate('perps.markets')}</Heading>
                {marketSelectorElement}
              </VStack>
            </Box>

            <Box
              bg={bgColor}
              borderRadius='lg'
              borderWidth='1px'
              borderColor={borderColor}
              p={4}
              flex={1}
            >
              <VStack spacing={4} align='stretch' height='full'>
                <Heading size='sm'>{translate('perps.orderbook.title')}</Heading>
                {orderbookElement}
              </VStack>
            </Box>
          </VStack>
        </GridItem>

        <GridItem colSpan={{ base: 1, lg: 1 }}>
          <Box
            bg={bgColor}
            borderRadius='lg'
            borderWidth='1px'
            borderColor={borderColor}
            overflow='hidden'
          >
            {chartElement}
          </Box>
        </GridItem>

        <GridItem rowSpan={{ base: 1, lg: 2 }} colSpan={1}>
          <VStack spacing={4} align='stretch' height='full'>
            <Box bg={bgColor} borderRadius='lg' borderWidth='1px' borderColor={borderColor} p={4}>
              {accountInfoElement}
            </Box>

            <Box
              bg={bgColor}
              borderRadius='lg'
              borderWidth='1px'
              borderColor={borderColor}
              p={4}
              flex={1}
            >
              {tradeFormElement}
            </Box>
          </VStack>
        </GridItem>

        <GridItem display={{ base: 'block', xl: 'none' }}>
          <Box bg={bgColor} borderRadius='lg' borderWidth='1px' borderColor={borderColor} p={4}>
            <VStack spacing={4} align='stretch'>
              <Heading size='sm'>{translate('perps.orderbook.title')}</Heading>
              {orderbookElement}
            </VStack>
          </Box>
        </GridItem>

        <GridItem colSpan={{ base: 1, lg: 2, xl: 2 }}>
          <Box bg={bgColor} borderRadius='lg' borderWidth='1px' borderColor={borderColor} p={4}>
            <VStack spacing={4} align='stretch'>
              <Heading size='sm'>{translate('perps.positions.title')}</Heading>
              {positionsListElement}
            </VStack>
          </Box>
        </GridItem>
      </Grid>
    </Main>
  )
})
