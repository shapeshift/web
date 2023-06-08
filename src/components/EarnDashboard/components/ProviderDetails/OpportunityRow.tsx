import { Button, Flex, List, useColorModeValue } from '@chakra-ui/react'
import { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetCell } from 'components/StakingVaults/Cells'
import { RawText } from 'components/Text'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type {
  LpEarnOpportunityType,
  StakingEarnOpportunityType,
} from 'state/slices/opportunitiesSlice/types'
import {
  getRewardBalances,
  getUnderlyingAssetIdsBalances,
} from 'state/slices/opportunitiesSlice/utils'
import { getMetadataForProvider } from 'state/slices/opportunitiesSlice/utils/getMetadataForProvider'
import {
  selectAssetById,
  selectAssets,
  selectSelectedCurrencyMarketDataSortedByMarketCap,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { NestedAsset } from './NestedAsset'
import { opportunityRowGrid } from './OpportunityTableHeader'

type OpportunityRowProps<T extends StakingEarnOpportunityType | LpEarnOpportunityType> = {
  onClick: (opportunity: T, action: DefiAction) => void
  opportunity: T
}

export const OpportunityRow: React.FC<
  OpportunityRowProps<StakingEarnOpportunityType | LpEarnOpportunityType>
> = ({ onClick, opportunity }) => {
  const {
    assetId,
    underlyingAssetId,
    fiatAmount,
    isClaimableRewards,
    underlyingAssetRatiosBaseUnit,
    cryptoAmountBaseUnit,
    underlyingAssetIds,
    group,
    type,
    apy,
    icons,
  } = opportunity
  const translate = useTranslate()
  const borderColor = useColorModeValue('blackAlpha.50', 'whiteAlpha.50')
  const asset = useAppSelector(state => selectAssetById(state, underlyingAssetId))
  const assets = useAppSelector(selectAssets)
  const marketData = useAppSelector(selectSelectedCurrencyMarketDataSortedByMarketCap)

  const rewardsBalances = useMemo(() => {
    if (!(opportunity as StakingEarnOpportunityType)?.rewardsCryptoBaseUnit) return []

    const earnOpportunity = opportunity as StakingEarnOpportunityType
    return getRewardBalances({
      rewardAssetIds: earnOpportunity.rewardAssetIds,
      rewardsCryptoBaseUnit: earnOpportunity.rewardsCryptoBaseUnit,
      assets,
      marketData,
    })
  }, [assets, marketData, opportunity])

  const underlyingAssetBalances = useMemo(() => {
    return getUnderlyingAssetIdsBalances({
      assetId,
      underlyingAssetIds,
      underlyingAssetRatiosBaseUnit,
      cryptoAmountBaseUnit,
      assets,
      marketData,
    })
  }, [
    assetId,
    assets,
    cryptoAmountBaseUnit,
    marketData,
    underlyingAssetIds,
    underlyingAssetRatiosBaseUnit,
  ])

  const nestedAssetIds = useMemo(() => {
    if ((opportunity as StakingEarnOpportunityType)?.rewardsCryptoBaseUnit) {
      const earnOpportunity = opportunity as StakingEarnOpportunityType
      return earnOpportunity.rewardAssetIds
    } else {
      const lpOpportunity = opportunity as LpEarnOpportunityType
      return lpOpportunity.underlyingAssetIds
    }
  }, [opportunity])

  const handleClick = useCallback(
    (action: DefiAction) => {
      if (opportunity.isReadOnly) {
        const url = getMetadataForProvider(opportunity.provider)?.url
        url && window.open(url, '_blank')
        return
      }
      onClick(opportunity, action)
    },
    [onClick, opportunity],
  )

  const subTextJoined = useMemo(() => {
    const aprElement = <Amount.Percent value={bnOrZero(apy).toString()} suffix='APY' autoColor />
    const hasBalanceElement = <RawText textTransform='capitalize'>{group ?? type}</RawText>
    const subText = [
      aprElement,
      ...(!bnOrZero(cryptoAmountBaseUnit).isZero() ? [hasBalanceElement] : []),
    ]

    return subText.map((element, index) => (
      <Flex gap={1} alignItems='center' key={`subtext-${index}`}>
        {index > 0 && <RawText>•</RawText>}
        {element}
      </Flex>
    ))
  }, [apy, cryptoAmountBaseUnit, group, type])

  const renderRewardAssets = useMemo(() => {
    if (!nestedAssetIds) return null
    return (
      <List style={{ marginTop: 0 }}>
        {Object.entries(rewardsBalances).map(([assetId, rewardBalance]) => {
          if (bnOrZero(rewardBalance.cryptoBalancePrecision).isZero()) return null
          return (
            <NestedAsset
              key={assetId}
              isClaimableRewards={isClaimableRewards}
              isExternal={opportunity.isReadOnly}
              assetId={assetId}
              balances={rewardBalance}
              onClick={() => handleClick(DefiAction.Claim)}
              type={translate('common.reward')}
            />
          )
        })}
        {Object.entries(underlyingAssetBalances).map(([assetId, underlyingAssetBalance]) => {
          if (bnOrZero(underlyingAssetBalance.cryptoBalancePrecision).isZero()) return null
          return (
            <NestedAsset
              key={assetId}
              isClaimableRewards={isClaimableRewards}
              isExternal={opportunity.isReadOnly}
              assetId={assetId}
              balances={underlyingAssetBalance}
              onClick={() => handleClick(DefiAction.Claim)}
              type={translate('defi.underlyingAsset')}
            />
          )
        })}
      </List>
    )
  }, [
    nestedAssetIds,
    rewardsBalances,
    underlyingAssetBalances,
    isClaimableRewards,
    opportunity.isReadOnly,
    translate,
    handleClick,
  ])
  if (!asset) return null
  return (
    <Flex
      flexDir='column'
      gap={4}
      borderBottomWidth={1}
      borderColor={borderColor}
      _last={{ borderBottomWidth: 0 }}
    >
      <List ml={0} mt={0} spacing={4} position='relative'>
        <Button
          variant='ghost'
          py={4}
          width='full'
          height='auto'
          display='grid'
          gridTemplateColumns={opportunityRowGrid}
          columnGap={4}
          alignItems='center'
          textAlign='left'
          onClick={() => handleClick(DefiAction.Overview)}
        >
          <AssetCell
            assetId={underlyingAssetId}
            icons={icons}
            subText={
              <Flex gap={1} fontSize={{ base: 'xs', md: 'sm' }} lineHeight='shorter'>
                {subTextJoined}
              </Flex>
            }
            justifyContent='flex-start'
            isExternal={opportunity.isReadOnly}
          />
          <Amount.Crypto
            value={bnOrZero(cryptoAmountBaseUnit)
              .div(bn(10).pow(asset.precision))
              .decimalPlaces(asset.precision)
              .toFixed(asset.precision)}
            symbol={asset.symbol}
            fontSize='sm'
            fontWeight='medium'
            whiteSpace='break-spaces'
            color='chakra-body-text'
            display={{ base: 'none', md: 'block ' }}
          />
          <Flex flexDir='column' alignItems={{ base: 'flex-end', md: 'flex-start' }}>
            <Amount.Fiat
              color='chakra-body-text'
              fontSize='sm'
              fontWeight='medium'
              value={fiatAmount}
              height='20px'
              lineHeight='shorter'
            />
            <Amount.Percent
              value={bnOrZero(marketData[asset.assetId]?.changePercent24Hr).div(100).toString()}
              autoColor
              fontSize='xs'
              lineHeight='shorter'
            />
          </Flex>
        </Button>
        {renderRewardAssets}
      </List>
    </Flex>
  )
}
