import { Button, Flex } from '@chakra-ui/react'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import qs from 'qs'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory, useLocation } from 'react-router'
import type { Row } from 'react-table'
import { RawText } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useInfiniteScroll } from 'hooks/useInfiniteScroll/useInfiniteScroll'
import { useWallet } from 'hooks/useWallet/useWallet'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { MixPanelEvent } from 'lib/mixpanel/types'
import type { LpEarnOpportunityType } from 'state/slices/opportunitiesSlice/types'
import { DefiProvider } from 'state/slices/opportunitiesSlice/types'
import { selectAssets } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { OpportunityRow } from './OpportunityRow'
import { OpportunityTableHeader } from './OpportunityTableHeader'

type WalletLpByAssetProps = {
  opportunities: LpEarnOpportunityType[]
}

export type RowProps = Row<LpEarnOpportunityType>

const flexPx = { base: 0, md: 2 }
const textDisplay = { base: 'none', md: 'block' }

export const WalletLpByAsset: React.FC<WalletLpByAssetProps> = ({ opportunities }) => {
  const location = useLocation()
  const history = useHistory()
  const translate = useTranslate()
  const {
    state: { isConnected, isDemoWallet },
    dispatch,
  } = useWallet()
  const assets = useAppSelector(selectAssets)
  const groupedItems = useMemo(() => {
    const groups = opportunities.reduce(
      (entryMap, currentItem) =>
        entryMap.set(currentItem.opportunityName, [
          ...(entryMap.get(currentItem.opportunityName) || []),
          currentItem,
        ]),
      new Map(),
    )
    return Array.from(groups.entries())
  }, [opportunities])

  const flatItems = useMemo(
    () => groupedItems.flatMap(item => (Array.isArray(item) ? item.flat() : [item])),
    [groupedItems],
  )

  const { next, data, hasMore } = useInfiniteScroll({
    array: flatItems,
  })

  const handleClick = useCallback(
    (opportunity: LpEarnOpportunityType, action: DefiAction) => {
      const {
        type,
        provider,
        contractAddress,
        chainId,
        rewardAddress,
        assetId,
        highestBalanceAccountAddress,
      } = opportunity
      const { assetReference, assetNamespace } = fromAssetId(assetId)

      if (!isConnected || isDemoWallet) {
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
        return
      }

      trackOpportunityEvent(
        MixPanelEvent.ClickOpportunity,
        {
          opportunity,
          element: 'Table Row',
        },
        assets,
      )

      if (provider === DefiProvider.rFOX) {
        return history.push('/rfox')
      }

      history.push({
        pathname: location.pathname,
        search: qs.stringify({
          type,
          provider,
          chainId,
          contractAddress,
          assetNamespace,
          assetReference,
          highestBalanceAccountAddress,
          rewardId: rewardAddress,
          modal: action,
        }),
        state: { background: location },
      })
    },
    [assets, dispatch, history, isConnected, isDemoWallet, location],
  )

  const renderRows = useMemo(() => {
    return (
      <Flex flexDir='column' gap={2}>
        {data.map((item, index) => {
          return typeof item === 'object' ? (
            <Flex
              px={flexPx}
              flexDirection='column'
              key={`${item.provider}-${item.assetId}-${item.apy}`}
            >
              <OpportunityRow
                // There may be multiple opportunities with the same provider and assetId - apy gives us some sort of unique keys safety
                onClick={handleClick}
                opportunity={item}
              />
            </Flex>
          ) : data.length === index + 1 ? null : (
            <OpportunityTableHeader key={`group-${item}`}>
              <RawText>{item}</RawText>
              <RawText display={textDisplay}>{translate('common.balance')}</RawText>
              <RawText>{translate('common.value')}</RawText>
            </OpportunityTableHeader>
          )
        })}
      </Flex>
    )
  }, [data, handleClick, translate])

  const handleLoadMoreClick = useCallback(() => next(), [next])

  if (!opportunities.length) return null

  return (
    <Flex flexDir='column' gap={8}>
      {renderRows}
      {hasMore && (
        <Button mx={2} onClick={handleLoadMoreClick}>
          {translate('common.loadMore')}
        </Button>
      )}
    </Flex>
  )
}
