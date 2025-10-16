import type { CardHeaderProps } from '@chakra-ui/react'
import { Box, CardHeader, Flex, Grid, Heading, useColorModeValue } from '@chakra-ui/react'
import type { JSX } from 'react'
import { useCallback, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { TradeInputTab } from '../../types'

import { Display } from '@/components/Display'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'

type SharedTradeInputHeaderProps = {
  initialTab: TradeInputTab
  isStandalone?: boolean
  rightContent?: JSX.Element
  onChangeTab: (newTab: TradeInputTab) => void
}

const cardPaddingX = { base: 2, md: 6 }
const cardHeaderBgProp = { base: 'background.surface.base', md: 'transparent' }
const cardPosition: CardHeaderProps['position'] = { base: 'sticky', md: 'static' }
const cardTop = {
  base: '0',
  md: 0,
}
const cardPaddingTop = {
  base: 'calc(env(safe-area-inset-top) + var(--safe-area-inset-top))',
  md: 4,
}
const cardMarginTop = {
  base: 'calc(-1 * calc(env(safe-area-inset-top) + var(--safe-area-inset-top)))',
  md: 0,
}

export const SharedTradeInputHeader = ({
  initialTab,
  rightContent,
  onChangeTab,
  isStandalone,
}: SharedTradeInputHeaderProps) => {
  const translate = useTranslate()
  const [selectedTab, setSelectedTab] = useState<TradeInputTab>(initialTab)
  const activeTextColor = useColorModeValue('black', 'white')
  const activeBgColor = useColorModeValue('blackAlpha.50', 'whiteAlpha.50')

  const enableLimitOrders = useFeatureFlag('LimitOrders')
  const enableSwapperFiatRamps = useFeatureFlag('SwapperFiatRamps')

  const handleChangeTab = useCallback(
    (newTab: TradeInputTab) => {
      setSelectedTab(newTab)
      onChangeTab(newTab)
    },
    [onChangeTab],
  )

  const handleClickTrade = useCallback(() => {
    handleChangeTab(TradeInputTab.Trade)
  }, [handleChangeTab])

  const handleClickLimitOrder = useCallback(() => {
    handleChangeTab(TradeInputTab.LimitOrder)
  }, [handleChangeTab])

  const handleClickBuyFiat = useCallback(() => {
    handleChangeTab(TradeInputTab.BuyFiat)
  }, [handleChangeTab])

  const handleClickSellFiat = useCallback(() => {
    handleChangeTab(TradeInputTab.SellFiat)
  }, [handleChangeTab])

  return (
    <CardHeader
      px={cardPaddingX}
      position={cardPosition}
      top={cardTop}
      zIndex={1}
      bg={cardHeaderBgProp}
      pt={cardPaddingTop}
      mt={cardMarginTop}
      className='swapper-header'
      flex='0 0 auto'
    >
      <Display.Desktop>
        <Flex alignItems='center' justifyContent='space-between'>
          <Flex gap={4}>
            <Heading
              as='h5'
              fontSize='md'
              color={selectedTab !== TradeInputTab.Trade ? 'text.subtle' : undefined}
              onClick={handleClickTrade}
              cursor={selectedTab !== TradeInputTab.Trade ? 'pointer' : undefined}
            >
              {translate('navBar.trade')}
            </Heading>
            {enableLimitOrders && !isStandalone && (
              <Heading
                as='h5'
                fontSize='md'
                color={selectedTab !== TradeInputTab.LimitOrder ? 'text.subtle' : undefined}
                onClick={handleClickLimitOrder}
                cursor={selectedTab !== TradeInputTab.LimitOrder ? 'pointer' : undefined}
              >
                {translate('limitOrder.heading')}
              </Heading>
            )}
            {enableSwapperFiatRamps && !isStandalone && (
              <Heading
                as='h5'
                fontSize='md'
                color={selectedTab !== TradeInputTab.BuyFiat ? 'text.subtle' : undefined}
                onClick={handleClickBuyFiat}
                cursor={selectedTab !== TradeInputTab.BuyFiat ? 'pointer' : undefined}
              >
                {translate('fiatRamps.buy')}
              </Heading>
            )}
            {enableSwapperFiatRamps && !isStandalone && (
              <Heading
                as='h5'
                fontSize='md'
                color={selectedTab !== TradeInputTab.SellFiat ? 'text.subtle' : undefined}
                onClick={handleClickSellFiat}
                cursor={selectedTab !== TradeInputTab.SellFiat ? 'pointer' : undefined}
              >
                {translate('fiatRamps.sell')}
              </Heading>
            )}
          </Flex>
          <Flex gap={2} alignItems='center' height={6}>
            {rightContent}
          </Flex>
        </Flex>
      </Display.Desktop>
      <Display.Mobile>
        <Grid templateColumns='1fr auto 1fr' alignItems='center' justifyContent='space-between'>
          <Box></Box>
          <Heading as='h5' fontSize='lg' textAlign='center'>
            {translate('transactionRow.swap')}
          </Heading>
          <Flex gap={2} alignItems='center' height={6} justifyContent='flex-end'>
            {rightContent}
          </Flex>
        </Grid>
        <Flex gap={4} mt={4} justifyContent='center'>
          <Flex bg={activeBgColor} borderRadius='full' w='fit-content' align='center'>
            <Box
              as='button'
              px={6}
              py={2}
              borderRadius='full'
              bg={selectedTab === TradeInputTab.Trade ? activeBgColor : 'none'}
              color={selectedTab === TradeInputTab.Trade ? activeTextColor : 'text.subtle'}
              fontWeight='bold'
              fontSize='sm'
              onClick={handleClickTrade}
              type='button'
            >
              {translate('navBar.market')}
            </Box>
            {enableLimitOrders && !isStandalone && (
              <Box
                as='button'
                px={6}
                py={2}
                borderRadius='full'
                bg={selectedTab === TradeInputTab.LimitOrder ? activeBgColor : 'none'}
                color={selectedTab === TradeInputTab.LimitOrder ? activeTextColor : 'text.subtle'}
                fontWeight='bold'
                fontSize='sm'
                ml={-2}
                onClick={handleClickLimitOrder}
                type='button'
              >
                {translate('limitOrder.heading')}
              </Box>
            )}
            {enableSwapperFiatRamps && !isStandalone && (
              <Box
                as='button'
                px={6}
                py={2}
                borderRadius='full'
                bg={selectedTab === TradeInputTab.BuyFiat ? activeBgColor : 'none'}
                color={selectedTab === TradeInputTab.BuyFiat ? activeTextColor : 'text.subtle'}
                fontWeight='bold'
                fontSize='sm'
                ml={-2}
                onClick={handleClickBuyFiat}
                type='button'
              >
                {translate('fiatRamps.buy')}
              </Box>
            )}
            {enableSwapperFiatRamps && !isStandalone && (
              <Box
                as='button'
                px={6}
                py={2}
                borderRadius='full'
                bg={selectedTab === TradeInputTab.SellFiat ? activeBgColor : 'none'}
                color={selectedTab === TradeInputTab.SellFiat ? activeTextColor : 'text.subtle'}
                fontWeight='bold'
                fontSize='sm'
                ml={-2}
                onClick={handleClickSellFiat}
                type='button'
              >
                {translate('fiatRamps.sell')}
              </Box>
            )}
          </Flex>
        </Flex>
      </Display.Mobile>
    </CardHeader>
  )
}
