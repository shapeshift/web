import type { CardHeaderProps } from '@chakra-ui/react'
import {
  Box,
  Button,
  CardHeader,
  Divider,
  Flex,
  Grid,
  Heading,
  useColorModeValue,
} from '@chakra-ui/react'
import type { JSX } from 'react'
import React, { useCallback, useMemo, useState } from 'react'
import { LuChevronsUpDown } from 'react-icons/lu'
import { useTranslate } from 'react-polyglot'

import { TradeInputTab } from '../../types'

import { Display } from '@/components/Display'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'

const selectorIcon = <LuChevronsUpDown fontSize='1em' />

type ToggleSwitcherProps = {
  label: string
  onClick: () => void
}

const ToggleSwitcher: React.FC<ToggleSwitcherProps> = ({ label, onClick }) => (
  <Flex alignItems='center' mt={4}>
    <Divider borderColor='border.subtle' />
    <Button
      variant='outline'
      size='sm'
      borderRadius='full'
      px={4}
      flexShrink={0}
      rightIcon={selectorIcon}
      fontWeight='medium'
      onClick={onClick}
    >
      {label}
    </Button>
    <Divider borderColor='border.subtle' />
  </Flex>
)

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
  const enableEarnTab = useFeatureFlag('EarnTab')

  const isSwapOrLimit =
    selectedTab === TradeInputTab.Trade || selectedTab === TradeInputTab.LimitOrder
  const isBuyOrSell =
    selectedTab === TradeInputTab.BuyFiat || selectedTab === TradeInputTab.SellFiat
  const showOrderTypeSwitcher = enableLimitOrders && !isStandalone && isSwapOrLimit
  const showBuySellSwitcher = enableSwapperFiatRamps && !isStandalone && isBuyOrSell

  const orderTypeLabel = useMemo(() => {
    return selectedTab === TradeInputTab.LimitOrder
      ? translate('limitOrder.heading')
      : translate('navBar.market')
  }, [selectedTab, translate])

  const buySellLabel = useMemo(() => {
    return selectedTab === TradeInputTab.SellFiat
      ? translate('fiatRamps.sell')
      : translate('fiatRamps.buy')
  }, [selectedTab, translate])

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

  const handleToggleOrderType = useCallback(() => {
    if (selectedTab === TradeInputTab.LimitOrder) {
      handleChangeTab(TradeInputTab.Trade)
    } else {
      handleChangeTab(TradeInputTab.LimitOrder)
    }
  }, [selectedTab, handleChangeTab])

  const handleClickBuyFiat = useCallback(() => {
    handleChangeTab(TradeInputTab.BuyFiat)
  }, [handleChangeTab])

  const handleToggleBuySell = useCallback(() => {
    if (selectedTab === TradeInputTab.SellFiat) {
      handleChangeTab(TradeInputTab.BuyFiat)
    } else {
      handleChangeTab(TradeInputTab.SellFiat)
    }
  }, [selectedTab, handleChangeTab])

  const handleClickEarn = useCallback(() => {
    handleChangeTab(TradeInputTab.Earn)
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
              color={!isSwapOrLimit ? 'text.subtle' : undefined}
              onClick={handleClickTrade}
              cursor={!isSwapOrLimit ? 'pointer' : undefined}
            >
              {translate('navBar.swap')}
            </Heading>
            {enableSwapperFiatRamps && !isStandalone && (
              <Heading
                as='h5'
                fontSize='md'
                color={!isBuyOrSell ? 'text.subtle' : undefined}
                onClick={handleClickBuyFiat}
                cursor={!isBuyOrSell ? 'pointer' : undefined}
              >
                {translate('navBar.buyCryptoShort')}
              </Heading>
            )}
            {enableEarnTab && !isStandalone && (
              <Heading
                as='h5'
                fontSize='md'
                color={selectedTab !== TradeInputTab.Earn ? 'text.subtle' : undefined}
                onClick={handleClickEarn}
                cursor={selectedTab !== TradeInputTab.Earn ? 'pointer' : undefined}
                data-testid='trade-tab-earn'
              >
                {translate('navBar.earn')}
              </Heading>
            )}
          </Flex>
          <Flex gap={2} alignItems='center' height={6}>
            {rightContent}
          </Flex>
        </Flex>
        {showOrderTypeSwitcher && (
          <ToggleSwitcher label={orderTypeLabel} onClick={handleToggleOrderType} />
        )}
        {showBuySellSwitcher && (
          <ToggleSwitcher label={buySellLabel} onClick={handleToggleBuySell} />
        )}
      </Display.Desktop>
      <Display.Mobile>
        <Grid templateColumns='1fr auto 1fr' alignItems='center' justifyContent='space-between'>
          <Box></Box>
          <Heading as='h5' fontSize='lg' textAlign='center'>
            {translate('common.trade')}
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
              bg={isSwapOrLimit ? activeBgColor : 'none'}
              color={isSwapOrLimit ? activeTextColor : 'text.subtle'}
              fontWeight='bold'
              fontSize='sm'
              onClick={handleClickTrade}
              type='button'
            >
              {translate('navBar.swap')}
            </Box>
            {enableSwapperFiatRamps && !isStandalone && (
              <Box
                as='button'
                px={6}
                py={2}
                borderRadius='full'
                bg={isBuyOrSell ? activeBgColor : 'none'}
                color={isBuyOrSell ? activeTextColor : 'text.subtle'}
                fontWeight='bold'
                fontSize='sm'
                ml={-2}
                onClick={handleClickBuyFiat}
                type='button'
              >
                {translate('navBar.buyCryptoShort')}
              </Box>
            )}
            {enableEarnTab && !isStandalone && (
              <Box
                as='button'
                px={6}
                py={2}
                borderRadius='full'
                bg={selectedTab === TradeInputTab.Earn ? activeBgColor : 'none'}
                color={selectedTab === TradeInputTab.Earn ? activeTextColor : 'text.subtle'}
                fontWeight='bold'
                fontSize='sm'
                ml={-2}
                onClick={handleClickEarn}
                type='button'
                data-testid='trade-tab-earn-mobile'
              >
                {translate('navBar.earn')}
              </Box>
            )}
          </Flex>
        </Flex>
        {showOrderTypeSwitcher && (
          <ToggleSwitcher label={orderTypeLabel} onClick={handleToggleOrderType} />
        )}
        {showBuySellSwitcher && (
          <ToggleSwitcher label={buySellLabel} onClick={handleToggleBuySell} />
        )}
      </Display.Mobile>
    </CardHeader>
  )
}
