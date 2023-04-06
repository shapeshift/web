import { Button, Flex, List, useColorModeValue } from '@chakra-ui/react'
import { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useCallback, useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { AssetCell } from 'components/StakingVaults/Cells'
import { RawText } from 'components/Text'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { StakingEarnOpportunityType } from 'state/slices/opportunitiesSlice/types'
import { getRewardBalances } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectAssets,
  selectMarketDataSortedByMarketCap,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { NestedAsset } from './NestedAsset'
import { OpportunityRowGrid } from './OpportunityTableHeader'

type StakingOpporityProps = {
  onClick: (opportunity: StakingEarnOpportunityType, action: DefiAction) => void
} & StakingEarnOpportunityType
export const StakingOppority: React.FC<StakingOpporityProps> = ({ onClick, ...opportunity }) => {
  const {
    underlyingAssetId,
    fiatAmount,
    stakedAmountCryptoBaseUnit,
    rewardAssetIds,
    rewardsCryptoBaseUnit,
    isClaimableRewards,
    type,
    apy,
  } = opportunity

  const borderColor = useColorModeValue('blackAlpha.50', 'whiteAlpha.50')
  const asset = useAppSelector(state => selectAssetById(state, underlyingAssetId))
  const assets = useAppSelector(selectAssets)
  const marketData = useAppSelector(selectMarketDataSortedByMarketCap)
  const rewardBalances = getRewardBalances({
    rewardAssetIds,
    rewardsCryptoBaseUnit,
    assets,
    marketData,
  })
  const handleClick = useCallback(
    (action: DefiAction) => {
      onClick(opportunity, action)
    },
    [onClick, opportunity],
  )
  const subText = [<Amount.Percent value={bnOrZero(apy).toString()} suffix='APY' autoColor />]
  if (bnOrZero(stakedAmountCryptoBaseUnit).gt(0))
    subText.push(<RawText textTransform='capitalize'>{type}</RawText>)
  const subTextJoined = subText.map((element, index) => (
    <>
      {index > 0 && <RawText>•</RawText>}
      {element}
    </>
  ))

  const renderRewardAssets = useMemo(() => {
    if (!rewardAssetIds) return null
    return (
      <List style={{ marginTop: 0 }}>
        {rewardAssetIds.map(rewardAssetId => {
          if (!rewardBalances[rewardAssetId]) return null
          if (bnOrZero(rewardBalances[rewardAssetId].cryptoBalancePrecision).eq(0)) return null
          return (
            <NestedAsset
              isClaimableRewards={isClaimableRewards}
              assetId={rewardAssetId}
              balances={rewardBalances[rewardAssetId]}
              onClick={() => handleClick(DefiAction.Claim)}
              type='Reward'
            />
          )
        })}
      </List>
    )
  }, [handleClick, isClaimableRewards, rewardAssetIds, rewardBalances])
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
          gridTemplateColumns={OpportunityRowGrid}
          columnGap={4}
          alignItems='center'
          textAlign='left'
          onClick={() => handleClick(DefiAction.Overview)}
        >
          <AssetCell
            assetId={underlyingAssetId}
            subText={
              <Flex gap={1} fontSize={{ base: 'xs', md: 'sm' }} lineHeight='shorter'>
                {subTextJoined}
              </Flex>
            }
            justifyContent='flex-start'
          />
          <Amount.Crypto
            value={bnOrZero(stakedAmountCryptoBaseUnit)
              .div(bn(10).pow(asset.precision))
              .decimalPlaces(asset.precision)
              .toString()}
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
