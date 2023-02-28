import { Avatar, Button, Flex, Stack } from '@chakra-ui/react'
import { Tag } from '@chakra-ui/tag'
import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import {
  DefiAction,
  DefiProviderMetadata,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import qs from 'qs'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory, useLocation } from 'react-router'
import type { Column, Row } from 'react-table'
import { Amount } from 'components/Amount/Amount'
import { ReactTable } from 'components/ReactTable/ReactTable'
import { RawText } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { LpEarnOpportunityType, OpportunityId } from 'state/slices/opportunitiesSlice/types'
import { getUnderlyingAssetIdsBalances } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAggregatedEarnUserLpOpportunities,
  selectAssets,
  selectCryptoMarketData,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type ProviderPositionProps = {
  ids: OpportunityId[]
  assetId: AssetId
}

export type RowProps = Row<LpEarnOpportunityType>

export const LpPositions: React.FC<ProviderPositionProps> = ({ ids, assetId }) => {
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
  const filteredDown = lpOpportunities.filter(e => ids.includes(e.assetId as OpportunityId))

  const handleClick = useCallback(
    (opportunity: RowProps, action: DefiAction) => {
      const {
        original: {
          type,
          provider,
          contractAddress,
          chainId,
          rewardAddress,
          assetId,
          highestBalanceAccountAddress,
        },
      } = opportunity
      const { assetReference, assetNamespace } = fromAssetId(assetId)

      if (!isConnected && isDemoWallet) {
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
        return
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
          modal: action ? action : 'overview',
        }),
        state: { background: location },
      })
    },
    [dispatch, history, isConnected, isDemoWallet, location],
  )
  const columns: Column<LpEarnOpportunityType>[] = useMemo(
    () => [
      {
        Header: translate('defi.liquidityPool'),
        accessor: 'assetId',
        Cell: ({ row }: { row: RowProps }) => {
          const providerIcon = DefiProviderMetadata[row.original.provider].icon
          return (
            <Flex alignItems='center' gap={4}>
              <Flex>
                <Avatar bg='transparent' size='sm' src={providerIcon} />
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
            underlyingAssetIds: row.original.underlyingAssetIds,
            underlyingAssetRatiosBaseUnit: row.original.underlyingAssetRatiosBaseUnit,
            cryptoAmountBaseUnit: row.original.cryptoAmountBaseUnit,
            assets,
            marketData,
          })
          return (
            <Flex direction='column'>
              <Flex gap={1}>
                <Amount.Fiat value={underlyingBalances[assetId].fiatAmount ?? 0} />
                <Flex color='gray.500'>
                  {'('} <Amount.Fiat value={row.original.fiatAmount} /> {')'}
                </Flex>
              </Flex>
              <Amount.Crypto
                variant='sub-text'
                size='xs'
                value={underlyingBalances[assetId].cryptoBalancePrecision ?? 0}
                symbol={assets[assetId]?.symbol ?? ''}
              />
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
              width='full'
              variant='ghost'
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
