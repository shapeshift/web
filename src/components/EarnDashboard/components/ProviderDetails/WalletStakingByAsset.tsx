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
import { MixPanelEvents } from 'lib/mixpanel/types'
import type {
  OpportunityId,
  StakingEarnOpportunityType,
} from 'state/slices/opportunitiesSlice/types'
import {
  selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
  selectAssets,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { OpportunityRow } from './OpportunityRow'
import { OpportunityTableHeader } from './OpportunityTableHeader'

type StakingPositionsByAssetProps = {
  ids: OpportunityId[]
}

export type RowProps = Row<StakingEarnOpportunityType>

export const WalletStakingByAsset: React.FC<StakingPositionsByAssetProps> = ({ ids }) => {
  const location = useLocation()
  const history = useHistory()
  const translate = useTranslate()
  const {
    state: { isConnected, isDemoWallet },
    dispatch,
  } = useWallet()
  const assets = useAppSelector(selectAssets)
  const stakingOpportunities = useAppSelector(
    selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
  )

  const filteredDown = stakingOpportunities.filter(e => ids.includes(e.id as OpportunityId))

  const groupedItems = useMemo(() => {
    const groups = filteredDown.reduce(
      (entryMap, currentItem) =>
        entryMap.set(currentItem.version ?? `${currentItem.provider} ${currentItem.type}`, [
          ...(entryMap.get(currentItem.version ?? `${currentItem.provider} ${currentItem.type}`) ||
            []),
          currentItem,
        ]),
      new Map(),
    )
    return Array.from(groups.entries())
  }, [filteredDown])

  const flatItems = useMemo(
    () => groupedItems.flatMap(item => (Array.isArray(item) ? item.flat() : [item])),
    [groupedItems],
  )
  const { next, data, hasMore } = useInfiniteScroll(flatItems)

  const handleClick = useCallback(
    (opportunity: StakingEarnOpportunityType, action: DefiAction) => {
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

      if (!isConnected && isDemoWallet) {
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
        return
      }

      trackOpportunityEvent(
        MixPanelEvents.ClickOpportunity,
        {
          opportunity,
          element: 'Table Row',
        },
        assets,
      )

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

  const renderStakingRows = useMemo(() => {
    return (
      <Flex flexDir='column' gap={2}>
        {data.map((item, index) => {
          return typeof item === 'object' ? (
            <Flex
              px={{ base: 0, md: 2 }}
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
              <RawText display={{ base: 'none', md: 'block' }}>
                {translate('common.balance')}
              </RawText>
              <RawText>{translate('common.value')}</RawText>
            </OpportunityTableHeader>
          )
        })}
      </Flex>
    )
  }, [data, handleClick, translate])

  if (!filteredDown.length) return null

  return (
    <Flex flexDir='column' gap={8}>
      {renderStakingRows}
      {hasMore && (
        <Button mx={2} onClick={() => next()}>
          {translate('common.loadMore')}
        </Button>
      )}
    </Flex>
  )
}
