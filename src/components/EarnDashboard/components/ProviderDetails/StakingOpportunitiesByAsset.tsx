import { Button, Flex } from '@chakra-ui/react'
import { Tag } from '@chakra-ui/tag'
import { fromAssetId } from '@shapeshiftoss/caip'
import { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import qs from 'qs'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory, useLocation } from 'react-router'
import type { Column, Row } from 'react-table'
import { Amount } from 'components/Amount/Amount'
import { ReactTable } from 'components/ReactTable/ReactTable'
import { AssetCell } from 'components/StakingVaults/Cells'
import { RawText } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { MixPanelEvents } from 'lib/mixpanel/types'
import type {
  OpportunityId,
  StakingEarnOpportunityType,
} from 'state/slices/opportunitiesSlice/types'
import { DefiProvider } from 'state/slices/opportunitiesSlice/types'
import {
  selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
  selectAssets,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type StakingPositionsByAssetProps = {
  ids: OpportunityId[]
}

export type RowProps = Row<StakingEarnOpportunityType>

export const StakingPositionsByAsset: React.FC<StakingPositionsByAssetProps> = ({ ids }) => {
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

  const handleClick = useCallback(
    (row: RowProps, action: DefiAction) => {
      const { original: opportunity } = row
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
  const columns: Column<StakingEarnOpportunityType>[] = useMemo(
    () => [
      {
        Header: translate('defi.stakingPosition'),
        accessor: 'assetId',
        Cell: ({ row }: { row: RowProps }) => {
          const isCosmosSdkStaking = row.original.provider === DefiProvider.CosmosSdk
          const chainName = isCosmosSdkStaking
            ? getChainAdapterManager().get(row.original.chainId)?.getDisplayName()
            : ''
          const subText = []
          if (chainName) subText.push(chainName)
          if (row.original.version) subText.push(row.original.version)
          return (
            <AssetCell
              assetId={row.original.underlyingAssetId ?? row.original.assetId}
              subText={subText.join(' • ')}
              icons={row.original.icons}
              opportunityName={row.original.opportunityName}
              showAssetSymbol={row.original.showAssetSymbol}
            />
          )
        },
        disableSortBy: true,
      },
      {
        Header: translate('defi.totalValue'),
        accessor: 'fiatAmount',
        Cell: ({ row }: { row: RowProps }) => {
          const opportunity = row.original
          const hasValue = bnOrZero(opportunity.fiatAmount).gt(0)
          return hasValue ? (
            <Flex flexDir='column' alignItems={{ base: 'flex-end', md: 'flex-start' }}>
              <Amount.Fiat value={row.original.fiatAmount} />
            </Flex>
          ) : (
            <RawText variant='sub-text'>-</RawText>
          )
        },
      },
      {
        Header: translate('defi.apy'),
        accessor: 'apy',
        Cell: ({ row }: { row: RowProps }) => (
          <Tag colorScheme='green'>
            <Amount.Percent value={row.original.apy} />
          </Tag>
        ),
      },
      {
        Header: () => null,
        id: 'expander',
        Cell: ({ row }: { row: RowProps }) => (
          <Flex justifyContent='flex-end' width='full'>
            <Button
              variant='ghost'
              size='sm'
              colorScheme='blue'
              width={{ base: 'full', md: 'auto' }}
              onClick={() => handleClick(row, DefiAction.Overview)}
            >
              {translate('common.manage')}
            </Button>
          </Flex>
        ),
      },
    ],
    [handleClick, translate],
  )

  if (!filteredDown.length) return null

  return (
    <ReactTable
      data={filteredDown}
      columns={columns}
      initialState={{ sortBy: [{ id: 'fiatAmount', desc: true }] }}
    />
  )
}
