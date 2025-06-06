import { ExternalLinkIcon } from '@chakra-ui/icons'
import { Button, Flex, Stack, Tag } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import qs from 'qs'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useLocation, useNavigate } from 'react-router-dom'
import type { Column, Row } from 'react-table'

import { Amount } from '@/components/Amount/Amount'
import { LazyLoadAvatar } from '@/components/LazyLoadAvatar'
import { ReactTable } from '@/components/ReactTable/ReactTable'
import { RawText } from '@/components/Text'
import { WalletActions } from '@/context/WalletProvider/actions'
import { DefiAction } from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { trackOpportunityEvent } from '@/lib/mixpanel/helpers'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import type { LpEarnOpportunityType, OpportunityId } from '@/state/slices/opportunitiesSlice/types'
import { getUnderlyingAssetIdsBalances } from '@/state/slices/opportunitiesSlice/utils'
import { getMetadataForProvider } from '@/state/slices/opportunitiesSlice/utils/getMetadataForProvider'
import {
  selectAggregatedEarnUserLpOpportunities,
  selectAssets,
  selectMarketDataUserCurrency,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type LpPositionsByProviderProps = {
  ids: OpportunityId[]
  assetId: AssetId
}

export type RowProps = Row<LpEarnOpportunityType>

const stackDivider = (
  <RawText variant='sub-text' size='xs' mx={1}>
    •
  </RawText>
)

const expanderButtonWidth = { base: 'full', md: 'auto' }

export const LpPositionsByProvider: React.FC<LpPositionsByProviderProps> = ({ ids, assetId }) => {
  const translate = useTranslate()
  const location = useLocation()
  const navigate = useNavigate()
  const {
    state: { isConnected },
    dispatch,
  } = useWallet()
  const assets = useAppSelector(selectAssets)
  const marketDataUserCurrency = useAppSelector(selectMarketDataUserCurrency)
  const lpOpportunities = useAppSelector(selectAggregatedEarnUserLpOpportunities)

  const filteredDown = useMemo(
    () =>
      lpOpportunities.filter(
        e => ids.includes(e.assetId as OpportunityId) || ids.includes(e.id as OpportunityId),
      ),
    [ids, lpOpportunities],
  )

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

      if (opportunity.isReadOnly) {
        const url = getMetadataForProvider(opportunity.provider)?.url
        url && window.open(url, '_blank')
        return
      }

      if (!isConnected) {
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

      navigate(
        {
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
            modal: action ? action : 'overview',
          }),
        },
        {
          state: { background: location },
        },
      )
    },
    [assets, dispatch, navigate, isConnected, location],
  )
  const columns: Column<LpEarnOpportunityType>[] = useMemo(
    () => [
      {
        Header: translate('defi.liquidityPool'),
        accessor: 'assetId',
        Cell: ({ row }: { row: RowProps }) => {
          const providerIcon = getMetadataForProvider(row.original.provider)?.icon ?? ''
          return (
            <Flex alignItems='center' gap={4}>
              <Flex>
                <LazyLoadAvatar
                  size='sm'
                  bg='transparent'
                  src={providerIcon}
                  key={`provider-icon-${row.original.id}`}
                />
              </Flex>
              <Flex flexDir='column'>
                <RawText>{row.original.opportunityName}</RawText>
                <Stack divider={stackDivider} alignItems='center' direction='row'>
                  <RawText textTransform='capitalize' variant='sub-text' size='xs'>
                    {row.original.provider}
                  </RawText>
                  {row.original.version && (
                    <RawText variant='sub-text' size='xs'>
                      {row.original.version}
                    </RawText>
                  )}
                </Stack>
              </Flex>
            </Flex>
          )
        },
        disableSortBy: true,
      },
      {
        Header: translate('defi.totalValue'),
        accessor: 'fiatAmount',
        Cell: ({ row }: { row: RowProps }) => {
          const underlyingBalances = getUnderlyingAssetIdsBalances({
            assetId: row.original.assetId,
            underlyingAssetIds: row.original.underlyingAssetIds,
            underlyingAssetRatiosBaseUnit: row.original.underlyingAssetRatiosBaseUnit,
            cryptoAmountBaseUnit: row.original.cryptoAmountBaseUnit,
            assets,
            marketDataUserCurrency,
          })
          return (
            <Flex direction='column'>
              <Flex gap={1}>
                <Amount.Fiat value={underlyingBalances[assetId].fiatAmount} />
                <Flex color='text.subtle'>
                  {'('} <Amount.Fiat value={row.original.fiatAmount} /> {')'}
                </Flex>
              </Flex>
              {row.original.underlyingAssetIds.map(assetId => (
                <Amount.Crypto
                  variant='sub-text'
                  key={`${assetId}-balance`}
                  size='xs'
                  value={underlyingBalances[assetId].cryptoBalancePrecision}
                  symbol={assets[assetId]?.symbol ?? ''}
                />
              ))}
            </Flex>
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
        Cell: ({ row }: { row: RowProps }) => {
          const url = getMetadataForProvider(row.original.provider)?.url
          const translation = (() => {
            if (!row.original.isReadOnly) return 'common.manage'
            return url ? 'common.view' : undefined
          })()

          const handleOverviewClick = useCallback(
            () => handleClick(row, DefiAction.Overview),
            [row],
          )

          return (
            <Flex gap={4} justifyContent='flex-end' width='full'>
              {translation && (
                <Button
                  variant='ghost'
                  width={expanderButtonWidth}
                  size='sm'
                  colorScheme='blue'
                  rightIcon={
                    row.original.isReadOnly && url ? <ExternalLinkIcon boxSize={3} /> : undefined
                  }
                  onClick={handleOverviewClick}
                >
                  {translate(translation)}
                </Button>
              )}
            </Flex>
          )
        },
      },
    ],
    [assetId, assets, handleClick, marketDataUserCurrency, translate],
  )

  if (!filteredDown.length) return null

  return <ReactTable data={filteredDown} columns={columns} />
}
