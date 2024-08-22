import { ArrowForwardIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import { Button, Flex } from '@chakra-ui/react'
import { Tag } from '@chakra-ui/tag'
import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset, MarketData } from '@shapeshiftoss/types'
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
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { MixPanelEvent } from 'lib/mixpanel/types'
import type {
  OpportunityId,
  StakingEarnOpportunityType,
} from 'state/slices/opportunitiesSlice/types'
import { getUnderlyingAssetIdsBalances } from 'state/slices/opportunitiesSlice/utils'
import { getMetadataForProvider } from 'state/slices/opportunitiesSlice/utils/getMetadataForProvider'
import {
  selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
  selectAssets,
  selectMarketDataUserCurrency,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type StakingPositionsByProviderProps = {
  ids: OpportunityId[]
  assetId: AssetId
}

const arrowForwardIcon = <ArrowForwardIcon />

export type RowProps = Row<StakingEarnOpportunityType>

type CalculateRewardFiatAmountArgs = {
  assets: Partial<Record<AssetId, Asset>>
  marketDataUserCurrency: Partial<Record<AssetId, MarketData>>
} & Pick<StakingEarnOpportunityType, 'rewardAssetIds' | 'rewardsCryptoBaseUnit'>

type CalculateRewardFiatAmount = (args: CalculateRewardFiatAmountArgs) => number

const widthMdAuto = { base: 'full', md: 'auto' }
const widthMdFlexStart = { base: 'flex-end', md: 'flex-start' }

const calculateRewardFiatAmount: CalculateRewardFiatAmount = ({
  rewardsCryptoBaseUnit,
  rewardAssetIds,
  assets,
  marketDataUserCurrency,
}) => {
  if (!rewardAssetIds) return 0
  return Array.from(rewardAssetIds).reduce((sum, assetId, index) => {
    const asset = assets[assetId]
    if (!asset) return sum
    const marketDataPrice = bnOrZero(marketDataUserCurrency[assetId]?.price)
    const cryptoAmountPrecision = bnOrZero(rewardsCryptoBaseUnit?.amounts[index]).div(
      bn(10).pow(asset?.precision),
    )
    sum = bnOrZero(cryptoAmountPrecision).times(marketDataPrice).plus(bnOrZero(sum)).toNumber()
    return sum
  }, 0)
}

export const StakingPositionsByProvider: React.FC<StakingPositionsByProviderProps> = ({
  ids,
  assetId,
}) => {
  const location = useLocation()
  const history = useHistory()
  const translate = useTranslate()
  const {
    state: { isConnected, isDemoWallet },
    dispatch,
  } = useWallet()
  const assets = useAppSelector(selectAssets)
  const marketDataUserCurrency = useAppSelector(selectMarketDataUserCurrency)
  const stakingOpportunities = useAppSelector(
    selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
  )
  const filteredDown = useMemo(
    () =>
      stakingOpportunities.filter(
        e => ids.includes(e.assetId as OpportunityId) || ids.includes(e.id as OpportunityId),
      ),
    [ids, stakingOpportunities],
  )

  const handleClick = useCallback(
    (row: RowProps, action: DefiAction) => {
      const { original: opportunity } = row

      if (opportunity.isReadOnly) {
        const url = getMetadataForProvider(opportunity.provider)?.url
        url && window.open(url, '_blank')
      }

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
        MixPanelEvent.ClickOpportunity,
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
                src={row.original.icon ?? getMetadataForProvider(row.original.provider)?.icon ?? ''}
                key={`provider-icon-${row.original.id}`}
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
          const opportunity = row.original
          const opportunityAssetId = opportunity.assetId
          const opportunityUnderlyingAssetId = opportunity.underlyingAssetId
          const hasValue = !bnOrZero(opportunity.fiatAmount).isZero()
          if (!opportunity.underlyingAssetIds.length) return null
          const isUnderlyingAsset = opportunity.underlyingAssetIds.includes(assetId)
          const underlyingAssetIndex = opportunity.underlyingAssetIds.indexOf(assetId)

          const underlyingBalances = getUnderlyingAssetIdsBalances({
            assetId: opportunityUnderlyingAssetId,
            underlyingAssetIds: opportunity.underlyingAssetIds,
            underlyingAssetRatiosBaseUnit: opportunity.underlyingAssetRatiosBaseUnit,
            cryptoAmountBaseUnit: opportunity.stakedAmountCryptoBaseUnit ?? '0',
            assets,
            marketDataUserCurrency,
          })

          const cryptoAmountPrecision = isUnderlyingAsset
            ? underlyingBalances[opportunity.underlyingAssetIds[underlyingAssetIndex]]
                .cryptoBalancePrecision
            : bnOrZero(opportunity.stakedAmountCryptoBaseUnit)
                .div(bn(10).pow(assets[opportunityAssetId]?.precision ?? 18))
                .toFixed()

          return hasValue ? (
            <Flex flexDir='column' alignItems={widthMdFlexStart}>
              <Amount.Fiat value={row.original.fiatAmount} />
              <Amount.Crypto
                variant='sub-text'
                size='xs'
                value={cryptoAmountPrecision.toString()}
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
        accessor: 'rewardsCryptoBaseUnit',
        Cell: ({ row }: { row: RowProps }) => {
          const fiatAmount = calculateRewardFiatAmount({
            rewardAssetIds: row.original.rewardAssetIds,
            rewardsCryptoBaseUnit: row.original.rewardsCryptoBaseUnit,
            assets,
            marketDataUserCurrency,
          })
          const hasRewardsBalance = bnOrZero(fiatAmount).gt(0)
          return hasRewardsBalance && row.original.isClaimableRewards ? (
            <Button
              isDisabled={!hasRewardsBalance}
              variant='ghost-filled'
              colorScheme='green'
              size='sm'
              minHeight='1.5rem'
              height='auto'
              borderRadius='lg'
              px={2}
              rightIcon={arrowForwardIcon}
              // we need to pass an arg here, so we need an anonymous function wrapper
              // eslint-disable-next-line react-memo/require-usememo
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
            rewardsCryptoBaseUnit: a.original.rewardsCryptoBaseUnit,
            assets,
            marketDataUserCurrency,
          })
          const bFiatPrice = calculateRewardFiatAmount({
            rewardAssetIds: b.original.rewardAssetIds,
            rewardsCryptoBaseUnit: b.original.rewardsCryptoBaseUnit,
            assets,
            marketDataUserCurrency,
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
              width={widthMdAuto}
              rightIcon={row.original.isReadOnly ? <ExternalLinkIcon boxSize={3} /> : undefined}
              // we need to pass an arg here, so we need an anonymous function wrapper
              // eslint-disable-next-line react-memo/require-usememo
              onClick={() => handleClick(row, DefiAction.Overview)}
            >
              {translate('common.manage')}
            </Button>
          </Flex>
        ),
      },
    ],
    [assetId, assets, handleClick, marketDataUserCurrency, translate],
  )

  if (!filteredDown.length) return null

  return <ReactTable data={filteredDown} columns={columns} />
}
