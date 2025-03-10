import { CardHeader, Flex, Heading } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'

import { useMultiHopTradeContext } from '../../context/MultiHopTradeContext'
import { TradeInputTab } from '../../types'

import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { selectWalletId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type SharedTradeInputHeaderProps = {
  rightContent?: JSX.Element
}

export const SharedTradeInputHeader = ({ rightContent }: SharedTradeInputHeaderProps) => {
  const translate = useTranslate()
  const { activeTab, handleChangeTab } = useMultiHopTradeContext()

  const enableBridgeClaims = useFeatureFlag('ArbitrumBridgeClaims')
  const enableLimitOrders = useFeatureFlag('LimitOrders')
  const walletId = useAppSelector(selectWalletId)

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
            color={activeTab !== TradeInputTab.Trade ? 'text.subtle' : undefined}
            onClick={handleClickTrade}
            cursor={activeTab !== TradeInputTab.Trade ? 'pointer' : undefined}
          >
            {translate('navBar.trade')}
          </Heading>
          {enableLimitOrders && (
            <Heading
              as='h5'
              fontSize='md'
              color={activeTab !== TradeInputTab.LimitOrder ? 'text.subtle' : undefined}
              onClick={handleClickLimitOrder}
              cursor={activeTab !== TradeInputTab.LimitOrder ? 'pointer' : undefined}
            >
              {translate('limitOrder.heading')}
            </Heading>
          )}
          {enableBridgeClaims && walletId && (
            <Heading
              as='h5'
              fontSize='md'
              color={activeTab !== TradeInputTab.Claim ? 'text.subtle' : undefined}
              onClick={handleClickClaim}
              cursor={activeTab !== TradeInputTab.Claim ? 'pointer' : undefined}
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
