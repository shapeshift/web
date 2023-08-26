import { Button, Flex, Stack } from '@chakra-ui/react'
import { Tag } from '@chakra-ui/tag'
import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import qs from 'qs'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory, useLocation } from 'react-router'
import type { Column, Row } from 'react-table'
import { Amount } from 'components/Amount/Amount'
import { LazyLoadAvatar } from 'components/LazyLoadAvatar'
import { ReactTable } from 'components/ReactTable/ReactTable'
import { RawText } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { MixPanelEvents } from 'lib/mixpanel/types'
import type { LpEarnOpportunityType, OpportunityId } from 'state/slices/opportunitiesSlice/types'
import { getUnderlyingAssetIdsBalances } from 'state/slices/opportunitiesSlice/utils'
import { getMetadataForProvider } from 'state/slices/opportunitiesSlice/utils/getMetadataForProvider'
import {
  selectAggregatedEarnUserLpOpportunities,
  selectAssets,
  selectCryptoMarketData,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type LpPositionsByProviderProps = {
  ids: OpportunityId[]
  assetId: AssetId
}

export type RowProps = Row<LpEarnOpportunityType>

export const LpPositionsByProvider: React.FC<LpPositionsByProviderProps> = ({ ids, assetId }) => {
  const translate = useTranslate()
  const location = useLocation()
  const history = useHistory()
  const {
    state: { isConnected, isDemoWallet },
    dispatch,
  } = useWallet()
  const assets = useAppSelector(selectAssets)
  const marketData = useAppSelector(selectCryptoMarketData)
  const lpOpportunities = useAppSelector(selectAggregatedEarnUserLpOpportunities)

  const filteredDown = lpOpportunities.filter(
    e => ids.includes(e.assetId as OpportunityId) || ids.includes(e.id as OpportunityId),
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
          modal: action ? action : 'overview',
        }),
        state: { background: location },
      })
    },
    [assets, dispatch, history, isConnected, isDemoWallet, location],
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
                <Stack
                  divider={
                    <RawText variant='sub-text' size='xs' mx={1}>
                      •
                    </RawText>
                  }
                  alignItems='center'
                  direction='row'
                >
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
            marketData,
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
        Cell: ({ row }: { row: RowProps }) => (
          <Flex gap={4} justifyContent='flex-end' width='full'>
            <Button
              variant='ghost'
              width={{ base: 'full', md: 'auto' }}
              size='sm'
              colorScheme='blue'
              onClick={() => handleClick(row, DefiAction.Overview)}
            >
              {translate('common.manage')}
            </Button>
          </Flex>
        ),
      },
    ],
    [assetId, assets, handleClick, marketData, translate],
  )

  if (!filteredDown.length) return null

  return <ReactTable data={filteredDown} columns={columns} />
}
