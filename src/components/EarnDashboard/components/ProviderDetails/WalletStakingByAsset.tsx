import { Flex, SimpleGrid, useColorModeValue } from '@chakra-ui/react'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import qs from 'qs'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory, useLocation } from 'react-router'
import type { Row } from 'react-table'
import { RawText } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
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

import { StakingOppority } from './StakingOpportunity'

type StakingPositionsByAssetProps = {
  ids: OpportunityId[]
}

export type RowProps = Row<StakingEarnOpportunityType>

export const WalletStakingByAsset: React.FC<StakingPositionsByAssetProps> = ({ ids }) => {
  const location = useLocation()
  const history = useHistory()
  const translate = useTranslate()
  const borderColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.100')
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
        {groupedItems.map(group => {
          const [name, values] = group
          return (
            <>
              <SimpleGrid
                gridTemplateColumns={{
                  base: 'minmax(150px, 1fr) repeat(1, minmax(40px, max-content))',
                  md: '1fr repeat(2, 170px)',
                }}
                color='gray.500'
                textTransform='uppercase'
                fontSize='xs'
                letterSpacing='0.02em'
                fontWeight='bold'
                borderBottomWidth={1}
                borderColor={borderColor}
                columnGap={4}
                pb={2}
                px={6}
              >
                <RawText>{name}</RawText>
                <RawText display={{ base: 'none', md: 'block' }}>
                  {translate('common.balance')}
                </RawText>
                <RawText>{translate('common.value')}</RawText>
              </SimpleGrid>
              <Flex px={2} flexDirection='column'>
                {values.map((staking: StakingEarnOpportunityType) => (
                  <StakingOppority key={staking.id} onClick={handleClick} {...staking} />
                ))}
              </Flex>
            </>
          )
        })}
      </Flex>
    )
  }, [borderColor, groupedItems, handleClick, translate])

  if (!filteredDown.length) return null

  return (
    <Flex flexDir='column' gap={8}>
      {renderStakingRows}
    </Flex>
  )
}
