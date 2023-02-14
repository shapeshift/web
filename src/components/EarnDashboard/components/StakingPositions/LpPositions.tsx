import { Button, Flex, Stack } from '@chakra-ui/react'
import { Tag } from '@chakra-ui/tag'
import type { AssetId } from '@shapeshiftoss/caip'
import { cosmosAssetId, cosmosChainId, fromAssetId, osmosisChainId } from '@shapeshiftoss/caip'
import { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import qs from 'qs'
import { useCallback, useMemo } from 'react'
import { useHistory, useLocation } from 'react-router'
import type { Column, Row } from 'react-table'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
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
  selectFirstAccountIdByChainId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type ProviderPositionProps = {
  ids: OpportunityId[]
  assetId: AssetId
}

export type RowProps = Row<LpEarnOpportunityType>

export const LpPositions: React.FC<ProviderPositionProps> = ({ ids, assetId }) => {
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

  const cosmosAccountId = useAppSelector(state =>
    selectFirstAccountIdByChainId(state, cosmosChainId),
  )
  const osmosisAccountId = useAppSelector(state =>
    selectFirstAccountIdByChainId(state, osmosisChainId),
  )

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
      const defaultAccountId = assetId === cosmosAssetId ? cosmosAccountId : osmosisAccountId

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
          defaultAccountId,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dispatch, history, isConnected, location],
  )
  const columns: Column<LpEarnOpportunityType>[] = useMemo(
    () => [
      {
        Header: 'Liquidity Pool',
        accessor: 'assetId',
        Cell: ({ row }: { row: RowProps }) => (
          <Flex alignItems='center' gap={4}>
            <Flex>
              {row.original.underlyingAssetIds.map(assetId => (
                <AssetIcon key={assetId} assetId={assetId} size='sm' _last={{ marginLeft: -4 }} />
              ))}
            </Flex>
            <Stack
              divider={
                <RawText color='gray.500' mx={1}>
                  •
                </RawText>
              }
              direction='row'
            >
              <RawText textTransform='capitalize'>{row.original.opportunityName}</RawText>
              {row.original.version && <RawText>{row.original.version}</RawText>}
            </Stack>
          </Flex>
        ),
        disableSortBy: true,
      },
      {
        Header: 'Total Value',
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
                fontSize='sm'
                color='gray.500'
                value={underlyingBalances[assetId].cryptoBalancePrecision ?? 0}
                symbol={assets[assetId]?.symbol ?? ''}
              />
            </Flex>
          )
        },
      },
      {
        Header: 'APY',
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
          <Flex gap={4} justifyContent='flex-end'>
            <Button
              variant='ghost'
              size='sm'
              colorScheme='green'
              onClick={() => handleClick(row, DefiAction.Deposit)}
            >
              Deposit
            </Button>
            <Button
              variant='ghost'
              size='sm'
              colorScheme='green'
              onClick={() => handleClick(row, DefiAction.Withdraw)}
            >
              Withdraw
            </Button>
          </Flex>
        ),
      },
    ],
    [assetId, assets, handleClick, marketData],
  )

  if (!filteredDown.length) return null

  return <ReactTable data={filteredDown} columns={columns} />
}
