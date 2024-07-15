import { Button, Flex, List, Stat, Tag } from '@chakra-ui/react'
import { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetCell } from 'components/StakingVaults/Cells'
import { RawText, Text } from 'components/Text'
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
import { selectAssetById, selectAssets, selectMarketDataUserCurrency } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { NestedAsset } from './NestedAsset'
import { opportunityRowGrid } from './OpportunityTableHeader'

type OpportunityRowProps<T extends StakingEarnOpportunityType | LpEarnOpportunityType> = {
  onClick: (opportunity: T, action: DefiAction) => void
  opportunity: T
}

const mt0 = { marginTop: 0 }
const borderBottomWidth0 = { borderBottomWidth: 0 }
const alignItemsMdFlexStart = { base: 'flex-end', md: 'flex-start' }

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
    expired,
  } = opportunity
  const translate = useTranslate()
  const history = useHistory()
  const asset = useAppSelector(state => selectAssetById(state, underlyingAssetId))
  const assets = useAppSelector(selectAssets)
  const marketDataUserCurrency = useAppSelector(selectMarketDataUserCurrency)

  const rewardsBalances = useMemo(() => {
    if (!(opportunity as StakingEarnOpportunityType)?.rewardsCryptoBaseUnit) return []

    const earnOpportunity = opportunity as StakingEarnOpportunityType
    return getRewardBalances({
      rewardAssetIds: earnOpportunity.rewardAssetIds,
      rewardsCryptoBaseUnit: earnOpportunity.rewardsCryptoBaseUnit,
      assets,
      marketDataUserCurrency,
    })
  }, [assets, marketDataUserCurrency, opportunity])

  const underlyingAssetBalances = useMemo(() => {
    return getUnderlyingAssetIdsBalances({
      assetId,
      underlyingAssetIds,
      underlyingAssetRatiosBaseUnit,
      cryptoAmountBaseUnit,
      assets,
      marketDataUserCurrency,
    })
  }, [
    assetId,
    assets,
    cryptoAmountBaseUnit,
    marketDataUserCurrency,
    underlyingAssetIds,
    underlyingAssetRatiosBaseUnit,
  ])

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

  const handleClaimClick = useCallback(() => handleClick(DefiAction.Claim), [handleClick])
  const handleOverviewClick = useCallback(() => handleClick(DefiAction.Overview), [handleClick])

  const subTextJoined = useMemo(() => {
    const aprElement = apy ? (
      <Amount.Percent value={bnOrZero(apy).toString()} suffix='APY' autoColor />
    ) : null
    const expiredElement = (
      <Stat fontWeight='medium'>
        <Tag colorScheme='yellow'>
          <Text translation='defi.ended' />
        </Tag>
      </Stat>
    )

    const hasBalanceElement = <RawText textTransform='capitalize'>{group ?? type}</RawText>
    const subText = [
      ...(expired ? [] : [aprElement]),
      ...(!bnOrZero(cryptoAmountBaseUnit).isZero() ? [hasBalanceElement] : []),
      ...(expired ? [expiredElement] : []),
    ]

    return subText.map((element, index) => (
      <Flex gap={1} alignItems='center' key={`subtext-${index}`}>
        {index > 0 && <RawText>•</RawText>}
        {element}
      </Flex>
    ))
  }, [apy, cryptoAmountBaseUnit, expired, group, type])

  const renderNestedAssets = useMemo(() => {
    return (
      <List style={mt0}>
        {Object.entries(rewardsBalances).map(([rewardAssetId, rewardBalance]) => {
          if (bnOrZero(rewardBalance.cryptoBalancePrecision).isZero()) return null
          return (
            <NestedAsset
              key={rewardAssetId}
              isClaimableRewards={isClaimableRewards}
              isExternal={opportunity.isReadOnly}
              assetId={rewardAssetId}
              balances={rewardBalance}
              onClick={handleClaimClick}
              type={translate('common.reward')}
            />
          )
        })}
        {Object.entries(underlyingAssetBalances).map(
          ([underlyingAssetId, underlyingAssetBalance]) => {
            // Don't display the same asset as an underlying, that's an implementation detail, but shouldn't be user-facing
            if (underlyingAssetId === assetId) return null
            if (bnOrZero(underlyingAssetBalance.cryptoBalancePrecision).isZero()) return null
            return (
              <NestedAsset
                key={underlyingAssetId}
                isClaimableRewards={isClaimableRewards}
                assetId={underlyingAssetId}
                balances={underlyingAssetBalance}
                // we need to pass an arg here, so we need an anonymous function wrapper
                // eslint-disable-next-line react-memo/require-usememo
                onClick={() => history.push(`/assets/${underlyingAssetId}`)}
                type={translate('defi.underlyingAsset')}
              />
            )
          },
        )}
      </List>
    )
  }, [
    rewardsBalances,
    underlyingAssetBalances,
    isClaimableRewards,
    opportunity.isReadOnly,
    handleClaimClick,
    translate,
    assetId,
    history,
  ])

  const assetCellSubText = useMemo(
    () => (
      // this node is already memoized
      // eslint-disable-next-line react-memo/require-usememo
      <Flex gap={1} fontSize={{ base: 'xs', md: 'sm' }} lineHeight='shorter'>
        {subTextJoined}
      </Flex>
    ),
    [subTextJoined],
  )

  if (!asset) return null
  return (
    <Flex
      flexDir='column'
      gap={4}
      borderBottomWidth={1}
      borderColor='border.base'
      _last={borderBottomWidth0}
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
          onClick={handleOverviewClick}
        >
          <AssetCell
            assetId={underlyingAssetId}
            icons={icons}
            subText={assetCellSubText}
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
          <Flex flexDir='column' alignItems={alignItemsMdFlexStart}>
            <Amount.Fiat
              color='chakra-body-text'
              fontSize='sm'
              fontWeight='medium'
              value={fiatAmount}
              height='20px'
              lineHeight='shorter'
            />
            <Amount.Percent
              value={bnOrZero(marketDataUserCurrency[asset.assetId]?.changePercent24Hr)
                .div(100)
                .toString()}
              autoColor
              fontSize='xs'
              lineHeight='shorter'
            />
          </Flex>
        </Button>
        {renderNestedAssets}
      </List>
    </Flex>
  )
}
