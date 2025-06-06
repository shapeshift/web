import { CardHeader, Flex, Heading } from '@chakra-ui/react'
import type { JSX } from 'react'
import { useCallback, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { TradeInputTab } from '../../types'

import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { selectWalletId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type SharedTradeInputHeaderProps = {
  initialTab: TradeInputTab
  isStandalone?: boolean
  rightContent?: JSX.Element
  onChangeTab: (newTab: TradeInputTab) => void
}

export const SharedTradeInputHeader = ({
  initialTab,
  rightContent,
  onChangeTab,
  isStandalone,
}: SharedTradeInputHeaderProps) => {
  const translate = useTranslate()
  const [selectedTab, setSelectedTab] = useState<TradeInputTab>(initialTab)

  const enableBridgeClaims = useFeatureFlag('ArbitrumBridgeClaims')
  const enableLimitOrders = useFeatureFlag('LimitOrders')
  const walletId = useAppSelector(selectWalletId)

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

  const handleClickClaim = useCallback(() => {
    handleChangeTab(TradeInputTab.Claim)
  }, [handleChangeTab])

  return (
    <CardHeader px={6}>
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
          {enableBridgeClaims && walletId && !isStandalone && (
            <Heading
              as='h5'
              fontSize='md'
              color={selectedTab !== TradeInputTab.Claim ? 'text.subtle' : undefined}
              onClick={handleClickClaim}
              cursor={selectedTab !== TradeInputTab.Claim ? 'pointer' : undefined}
            >
              {translate('bridge.claim')}
            </Heading>
          )}
        </Flex>
        <Flex gap={2} alignItems='center' height={6}>
          {rightContent}
        </Flex>
      </Flex>
    </CardHeader>
  )
}
