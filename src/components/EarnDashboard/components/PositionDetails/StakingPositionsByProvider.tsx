import { ArrowForwardIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import { Button, Flex, Tag, useMediaQuery } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import type { Asset, MarketData } from '@shapeshiftoss/types'
import qs from 'qs'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useLocation } from 'react-router-dom'
import type { Column, Row } from 'react-table'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { LazyLoadAvatar } from '@/components/LazyLoadAvatar'
import { ReactTable } from '@/components/ReactTable/ReactTable'
import type { YieldOpportunityDisplay } from '@/components/StakingVaults/hooks/useYieldAsOpportunities'
import { RawText } from '@/components/Text'
import { WalletActions } from '@/context/WalletProvider/actions'
import { DefiAction } from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useBrowserRouter } from '@/hooks/useBrowserRouter/useBrowserRouter'
import { useModal } from '@/hooks/useModal/useModal'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bn, bnOrZero } from '@/lib/bignumber/bignumber'
import { trackOpportunityEvent } from '@/lib/mixpanel/helpers'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import { RFOX_STAKING_ASSET_IDS } from '@/pages/RFOX/constants'
import { useCurrentApyQuery } from '@/pages/RFOX/hooks/useCurrentApyQuery'
import type {
  OpportunityId,
  StakingEarnOpportunityType,
} from '@/state/slices/opportunitiesSlice/types'
import { DefiProvider } from '@/state/slices/opportunitiesSlice/types'
import { getMetadataForProvider } from '@/state/slices/opportunitiesSlice/utils/getMetadataForProvider'
import {
  selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
  selectAssets,
  selectMarketDataUserCurrency,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'
import { breakpoints } from '@/theme/theme'

type UnifiedPosition = StakingEarnOpportunityType & {
  isYield?: boolean
  yieldId?: string
}

type StakingPositionsByProviderProps = {
  ids: OpportunityId[]
  forceCompactView?: boolean
  yieldOpportunities?: YieldOpportunityDisplay[]
}

const arrowForwardIcon = <ArrowForwardIcon />

export type RowProps = Row<UnifiedPosition>

type CalculateRewardFiatAmountArgs = {
  assets: Partial<Record<AssetId, Asset>>
  marketDataUserCurrency: Partial<Record<AssetId, MarketData>>
} & Pick<StakingEarnOpportunityType, 'rewardAssetIds' | 'rewardsCryptoBaseUnit'>

type CalculateRewardFiatAmount = (args: CalculateRewardFiatAmountArgs) => number

const widthMdAuto = { base: 'full', md: 'auto' }
const widthMdFlexStart = { base: 'flex-end', md: 'flex-start' }

// We're not getting the APY in RFOX resolver since we rely on a bunch of sequencial react-query hooks
// So this handles RFOX specifically
const RfoxApy: React.FC<{ stakingAssetId: AssetId }> = ({ stakingAssetId }) => {
  const currentApyQuery = useCurrentApyQuery({ stakingAssetId })

  return (
    <Tag colorScheme='green'>
      <Amount.Percent value={currentApyQuery?.data ?? '0'} />
    </Tag>
  )
}

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
  forceCompactView,
  yieldOpportunities,
}) => {
  const location = useLocation()
  const { navigate } = useBrowserRouter()
  const walletDrawer = useModal('walletDrawer')
  const translate = useTranslate()
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })

  const isCompactCols = !isLargerThanMd || forceCompactView

  const {
    state: { isConnected },
    dispatch,
  } = useWallet()
  const assets = useAppSelector(selectAssets)
  const marketDataUserCurrency = useAppSelector(selectMarketDataUserCurrency)
  const stakingOpportunities = useAppSelector(
    selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
  )

  const yieldPositionsAsUnified = useMemo<UnifiedPosition[]>(() => {
    if (!yieldOpportunities?.length) return []
    return yieldOpportunities.map(y => ({
      id: y.yieldId,
      assetId: y.inputAssetId,
      underlyingAssetId: y.inputAssetId,
      provider: y.providerName,
      apy: y.apy,
      fiatAmount: y.fiatAmount,
      icon: y.providerIcon,
      isYield: true,
      yieldId: y.yieldId,
      isReadOnly: true,
      opportunityName: undefined,
    })) as unknown as UnifiedPosition[]
  }, [yieldOpportunities])

  const legacyFiltered = useMemo(
    () =>
      stakingOpportunities.filter(
        e => ids.includes(e.assetId as OpportunityId) || ids.includes(e.id as OpportunityId),
      ),
    [ids, stakingOpportunities],
  )

  const filteredDown = useMemo<UnifiedPosition[]>(
    () => [...yieldPositionsAsUnified, ...legacyFiltered],
    [yieldPositionsAsUnified, legacyFiltered],
  )

  const handleClick = useCallback(
    (row: RowProps, action: DefiAction) => {
      const { original: opportunity } = row

      if (opportunity.isYield && opportunity.yieldId) {
        if (walletDrawer.isOpen) {
          walletDrawer.close()
        }
        navigate(`/yield/${opportunity.yieldId}`)
        return
      }

      if (opportunity.isReadOnly) {
        const url = getMetadataForProvider(opportunity.provider)?.url
        url && window.open(url, '_blank')
        return
      }

      const legacyOpp = opportunity as StakingEarnOpportunityType
      const {
        type,
        provider,
        contractAddress,
        chainId,
        rewardAddress,
        assetId,
        highestBalanceAccountAddress,
      } = legacyOpp
      const { assetReference, assetNamespace } = fromAssetId(assetId)

      if (provider === DefiProvider.rFOX) {
        if (walletDrawer.isOpen) {
          walletDrawer.close()
        }
        return navigate('/fox-ecosystem')
      }

      if (forceCompactView) {
        if (walletDrawer.isOpen) {
          walletDrawer.close()
        }

        switch (provider) {
          case DefiProvider.EthFoxStaking:
            return navigate('/fox-ecosystem')
          case DefiProvider.ThorchainSavers:
            return navigate(`/assets/${assetId}`)
          default:
            break
        }
      }

      if (!isConnected) {
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
        return
      }

      trackOpportunityEvent(
        MixPanelEvent.ClickOpportunity,
        {
          opportunity: legacyOpp,
          element: 'Table Row',
        },
        assets,
      )

      if (walletDrawer.isOpen) {
        walletDrawer.close()
      }

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
            modal: action,
          }),
        },
        {
          state: { background: location },
        },
      )
    },
    [forceCompactView, isConnected, assets, walletDrawer, navigate, location, dispatch],
  )
  const columns: Column<UnifiedPosition>[] = useMemo(
    () => [
      {
        Header: translate('defi.stakingPosition'),
        accessor: 'assetId',
        Cell: ({ row }: { row: RowProps }) => {
          const opp = row.original as StakingEarnOpportunityType & UnifiedPosition
          const subText = []
          if (opp.version) subText.push(opp.provider)
          if (opp.opportunityName) subText.push(opp.opportunityName)
          const isRunePool = opp.assetId === thorchainAssetId
          const providerName = isRunePool ? 'RUNEPool' : opp.version ?? opp.provider
          const iconElement = opp.isYield ? (
            <AssetIcon assetId={opp.assetId} size='sm' />
          ) : (
            <LazyLoadAvatar
              size='sm'
              bg='transparent'
              src={opp.icon ?? getMetadataForProvider(opp.provider)?.icon ?? ''}
              key={`provider-icon-${opp.id}`}
            />
          )
          return (
            <Flex gap={4} alignItems='center'>
              {iconElement}
              <Flex flexDir='column'>
                <RawText>{providerName}</RawText>
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
          const opp = row.original as StakingEarnOpportunityType & UnifiedPosition

          const fiatRewardsAmount = opp.isYield
            ? 0
            : calculateRewardFiatAmount({
                rewardAssetIds: opp.rewardAssetIds,
                rewardsCryptoBaseUnit: opp.rewardsCryptoBaseUnit,
                assets,
                marketDataUserCurrency,
              })

          const hasValue = bnOrZero(opp.fiatAmount).gt(0) || bnOrZero(fiatRewardsAmount).gt(0)
          const totalFiatAmount = bnOrZero(opp.fiatAmount).toFixed(2)

          return hasValue ? (
            <Flex flexDir='column' alignItems={widthMdFlexStart}>
              <Amount.Fiat value={totalFiatAmount} />
            </Flex>
          ) : (
            <RawText variant='sub-text'>-</RawText>
          )
        },
      },
      {
        Header: translate('defi.apy'),
        accessor: 'apy',
        Cell: ({ row }: { row: RowProps }) => {
          const opp = row.original as StakingEarnOpportunityType & UnifiedPosition
          const isRfoxStaking =
            !opp.isYield && RFOX_STAKING_ASSET_IDS.includes(opp.underlyingAssetId)

          if (isRfoxStaking) return <RfoxApy stakingAssetId={opp.underlyingAssetId} />

          return (
            <Tag colorScheme='green'>
              <Amount.Percent value={opp.apy} />
            </Tag>
          )
        },
      },
      {
        Header: translate('defi.claimableRewards'),
        accessor: 'id',
        display: isCompactCols ? 'none' : undefined,
        Cell: ({ row }: { row: RowProps }) => {
          const opp = row.original as StakingEarnOpportunityType & UnifiedPosition
          const handleClaimClick = useCallback(() => handleClick(row, DefiAction.Claim), [row])

          if (opp.isYield) return <RawText variant='sub-text'>-</RawText>

          const fiatAmount = calculateRewardFiatAmount({
            rewardAssetIds: opp.rewardAssetIds,
            rewardsCryptoBaseUnit: opp.rewardsCryptoBaseUnit,
            assets,
            marketDataUserCurrency,
          })
          const hasRewardsBalance = bnOrZero(fiatAmount).gt(0)

          return hasRewardsBalance && opp.isClaimableRewards ? (
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
              onClick={handleClaimClick}
            >
              <Amount.Fiat value={fiatAmount} />
            </Button>
          ) : (
            <RawText variant='sub-text'>-</RawText>
          )
        },
      },
      {
        Header: () => null,
        id: 'expander',
        display: isCompactCols ? 'none' : undefined,
        Cell: ({ row }: { row: RowProps }) => {
          const opp = row.original as StakingEarnOpportunityType & UnifiedPosition
          const url = getMetadataForProvider(opp.provider)?.url
          const translation = (() => {
            if (opp.isYield) return 'common.view'
            if (!opp.isReadOnly) return 'common.manage'
            return url ? 'common.view' : undefined
          })()
          const handleOverviewClick = useCallback(
            () => handleClick(row, DefiAction.Overview),
            [row],
          )

          return (
            <Flex justifyContent='flex-end' width='full'>
              {translation && (
                <Button
                  variant='ghost'
                  size='sm'
                  colorScheme='blue'
                  width={widthMdAuto}
                  rightIcon={opp.isReadOnly && url ? <ExternalLinkIcon boxSize={3} /> : undefined}
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
    [assets, handleClick, marketDataUserCurrency, translate, isCompactCols],
  )

  const handleRowClick = useCallback(
    (row: RowProps) => {
      if (isCompactCols) {
        handleClick(row, DefiAction.Overview)
      }
    },
    [isCompactCols, handleClick],
  )

  if (!filteredDown.length) return null

  return (
    <ReactTable
      data={filteredDown}
      columns={columns}
      displayHeaders={!isCompactCols}
      onRowClick={isCompactCols ? handleRowClick : undefined}
    />
  )
}
