import { Flex } from '@chakra-ui/react'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import qs from 'qs'
import { useCallback, useMemo } from 'react'
import { useHistory, useLocation } from 'react-router'
import type { Row } from 'react-table'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { MixPanelEvents } from 'lib/mixpanel/types'
import type { LpEarnOpportunityType, OpportunityId } from 'state/slices/opportunitiesSlice/types'
import { selectAggregatedEarnUserLpOpportunities, selectAssets } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { LpOpportunity } from './LpOpportunity'

type WalletLpByAssetProps = {
  ids: OpportunityId[]
}

export type RowProps = Row<LpEarnOpportunityType>

export const WalletLpByAsset: React.FC<WalletLpByAssetProps> = ({ ids }) => {
  const location = useLocation()
  const history = useHistory()
  const {
    state: { isConnected, isDemoWallet },
    dispatch,
  } = useWallet()
  const assets = useAppSelector(selectAssets)
  const lpOpportunities = useAppSelector(selectAggregatedEarnUserLpOpportunities)
  const filteredDown = lpOpportunities.filter(e => ids.includes(e.assetId as OpportunityId))

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

  const renderRows = useMemo(() => {
    return filteredDown.map(lp => <LpOpportunity onClick={handleClick} {...lp} />)
  }, [filteredDown, handleClick])

  if (!filteredDown.length) return null

  return (
    <Flex flexDir='column' gap={8}>
      {renderRows}
    </Flex>
  )
}
