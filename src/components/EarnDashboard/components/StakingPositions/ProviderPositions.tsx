import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Button, Flex } from '@chakra-ui/react'
import { Tag } from '@chakra-ui/tag'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/investor-foxy'
import type { MarketData } from '@shapeshiftoss/types'
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
import { LazyLoadAvatar } from 'components/LazyLoadAvatar'
import { ReactTable } from 'components/ReactTable/ReactTable'
import { RawText } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn } from 'lib/bignumber/bignumber'
import type {
  OpportunityId,
  StakingEarnOpportunityType,
} from 'state/slices/opportunitiesSlice/types'
import {
  selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
  selectAssets,
  selectCryptoMarketData,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type ProviderPositionProps = {
  ids: OpportunityId[]
  assetId: AssetId
}

export type RowProps = Row<StakingEarnOpportunityType>

type CalculateRewardFiatAmountArgs = {
  assets: Partial<Record<AssetId, Asset>>
  marketData: Partial<Record<AssetId, MarketData>>
} & Pick<StakingEarnOpportunityType, 'rewardAssetIds' | 'rewardsAmountsCryptoBaseUnit'>

type CalculateRewardFiatAmount = (args: CalculateRewardFiatAmountArgs) => number

const calculateRewardFiatAmount: CalculateRewardFiatAmount = ({
  rewardsAmountsCryptoBaseUnit,
  rewardAssetIds,
  assets,
  marketData,
}) => {
  if (!rewardAssetIds) return 0
  return Array.from(rewardAssetIds).reduce((sum, assetId, index) => {
    const asset = assets[assetId]
    if (!asset) return sum
    const marketDataPrice = bnOrZero(marketData[assetId]?.price)
    const cryptoAmountPrecision = bnOrZero(rewardsAmountsCryptoBaseUnit?.[index]).div(
      bn(10).pow(asset?.precision),
    )
    sum = bnOrZero(cryptoAmountPrecision).times(marketDataPrice).plus(bnOrZero(sum)).toNumber()
    return sum
  }, 0)
}

export const ProviderPositions: React.FC<ProviderPositionProps> = ({ ids, assetId }) => {
  const location = useLocation()
  const history = useHistory()
  const translate = useTranslate()
  const {
    state: { isConnected, isDemoWallet },
    dispatch,
  } = useWallet()
  const assets = useAppSelector(selectAssets)
  const marketData = useAppSelector(selectCryptoMarketData)
  const stakingOpportunities = useAppSelector(
    selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
  )
  const filteredDown = stakingOpportunities.filter(e => ids.includes(e.assetId as OpportunityId))

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
          modal: action,
        }),
        state: { background: location },
      })
    },
    [dispatch, history, isConnected, isDemoWallet, location],
  )
  const columns: Column<StakingEarnOpportunityType>[] = useMemo(
    () => [
      {
        Header: translate('defi.stakingPosition'),
        accessor: 'assetId',
        Cell: ({ row }: { row: RowProps }) => {
          // Version or Provider
          // Opportunity Name
          const subText = []
          if (row.original.version) subText.push(row.original.provider)
          if (row.original.opportunityName) subText.push(row.original.opportunityName)
          return (
            <Flex gap={4} alignItems='center'>
              <LazyLoadAvatar
                size='sm'
                bg='transparent'
                src={DefiProviderMetadata[row.original.provider].icon}
              />
              <Flex flexDir='column'>
                <RawText>{row.original.version ?? row.original.provider}</RawText>
                <RawText textTransform='capitalize' variant='sub-text' size='xs'>
                  {subText.join(' • ')}
                </RawText>
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
          const hasValue = bnOrZero(row.original.fiatAmount).gt(0)
          return hasValue ? (
            <Flex flexDir='column' alignItems={{ base: 'flex-end', md: 'flex-start' }}>
              <Amount.Fiat value={row.original.fiatAmount} />
              <Amount.Crypto
                variant='sub-text'
                size='xs'
                value={bnOrZero(row.original.cryptoAmountBaseUnit)
                  .div(bnOrZero(10).pow(assets[assetId]?.precision ?? 0))
                  .toString()}
                symbol={assets[assetId]?.symbol ?? ''}
              />
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
        Header: translate('defi.claimableRewards'),
        accessor: 'rewardsAmountsCryptoBaseUnit',
        Cell: ({ row }: { row: RowProps }) => {
          const fiatAmount = calculateRewardFiatAmount({
            rewardAssetIds: row.original.rewardAssetIds,
            rewardsAmountsCryptoBaseUnit: row.original.rewardsAmountsCryptoBaseUnit,
            assets,
            marketData,
          })
          const hasRewardBalance = bnOrZero(fiatAmount).gt(0)
          return hasRewardBalance ? (
            <Button
              isDisabled={!hasRewardBalance}
              variant='ghost-filled'
              colorScheme='green'
              size='sm'
              minHeight='1.5rem'
              height='auto'
              borderRadius='lg'
              px={2}
              rightIcon={<ArrowForwardIcon />}
              onClick={() => handleClick(row, DefiAction.Claim)}
            >
              <Amount.Fiat value={fiatAmount} />
            </Button>
          ) : (
            <RawText variant='sub-text'>-</RawText>
          )
        },
        sortType: (a: RowProps, b: RowProps): number => {
          const aFiatPrice = calculateRewardFiatAmount({
            rewardAssetIds: a.original.rewardAssetIds,
            rewardsAmountsCryptoBaseUnit: a.original.rewardsAmountsCryptoBaseUnit,
            assets,
            marketData,
          })
          const bFiatPrice = calculateRewardFiatAmount({
            rewardAssetIds: b.original.rewardAssetIds,
            rewardsAmountsCryptoBaseUnit: b.original.rewardsAmountsCryptoBaseUnit,
            assets,
            marketData,
          })
          return aFiatPrice - bFiatPrice
        },
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
              width='full'
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
