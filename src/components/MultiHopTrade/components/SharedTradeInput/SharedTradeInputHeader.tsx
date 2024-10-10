import { CardHeader, Flex, Heading } from '@chakra-ui/react'
import { assertUnreachable } from '@shapeshiftoss/utils'
import { useCallback, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'

import { TradeInputTab, TradeRoutePaths } from '../../types'

type SharedTradeInputHeaderProps = {
  initialTab: TradeInputTab
  rightContent?: JSX.Element
}

export const SharedTradeInputHeader = ({
  initialTab,
  rightContent,
}: SharedTradeInputHeaderProps) => {
  const history = useHistory()
  const translate = useTranslate()
  const [selectedTab, setSelectedTab] = useState<TradeInputTab>(initialTab)

  const enableBridgeClaims = useFeatureFlag('ArbitrumBridgeClaims')

  const handleChangeTab = useCallback(
    (newTab: TradeInputTab) => {
      setSelectedTab(newTab)
      switch (newTab) {
        case TradeInputTab.Trade:
          history.push(TradeRoutePaths.Input)
          break
        case TradeInputTab.Claim:
          history.push(TradeRoutePaths.Claim)
          break
        default:
          assertUnreachable(newTab)
      }
    },
    [history],
  )

  const handleClickTrade = useCallback(() => {
    handleChangeTab(TradeInputTab.Trade)
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
          {enableBridgeClaims && (
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
