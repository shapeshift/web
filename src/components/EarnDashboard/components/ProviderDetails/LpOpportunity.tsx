import { Button, Flex, List, useColorModeValue } from '@chakra-ui/react'
import { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetCell } from 'components/StakingVaults/Cells'
import { RawText } from 'components/Text'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { LpEarnOpportunityType } from 'state/slices/opportunitiesSlice/types'
import { getUnderlyingAssetIdsBalances } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectAssets,
  selectMarketDataSortedByMarketCap,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { NestedAsset } from './NestedAsset'
import { OpportunityRowGrid, OpportunityTableHeader } from './OpportunityTableHeader'

type LpOpportunityProps = {
  onClick: (opportunity: LpEarnOpportunityType, action: DefiAction) => void
} & LpEarnOpportunityType

export const LpOpportunity: React.FC<LpOpportunityProps> = ({ onClick, ...opportunity }) => {
  const {
    assetId,
    underlyingAssetId,
    fiatAmount,
    version,
    opportunityName,
    type,
    rewardAssetIds,
    isClaimableRewards,
    underlyingAssetIds,
    underlyingAssetRatiosBaseUnit,
    cryptoAmountBaseUnit,
  } = opportunity
  const translate = useTranslate()
  const borderColor = useColorModeValue('blackAlpha.50', 'whiteAlpha.50')
  const asset = useAppSelector(state => selectAssetById(state, underlyingAssetId))
  const assets = useAppSelector(selectAssets)
  const marketData = useAppSelector(selectMarketDataSortedByMarketCap)
  const underlyingAssetBalances = getUnderlyingAssetIdsBalances({
    assetId,
    underlyingAssetIds,
    underlyingAssetRatiosBaseUnit,
    cryptoAmountBaseUnit,
    assets,
    marketData,
  })
  const handleClick = useCallback(
    (action: DefiAction) => {
      onClick(opportunity, action)
    },
    [onClick, opportunity],
  )
  if (!asset) return null
  return (
    <Flex
      flexDir='column'
      gap={4}
      borderBottomWidth={1}
      borderColor={borderColor}
      _last={{ borderBottomWidth: 0 }}
    >
      <OpportunityTableHeader>
        <RawText>
          {version ?? opportunityName} {type}
        </RawText>
        <RawText>{translate('common.balance')}</RawText>
        <RawText>{translate('common.value')}</RawText>
      </OpportunityTableHeader>
      <List ml={0} mt={0} spacing={4}>
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
            subText='Liquidity Position'
            justifyContent='flex-start'
          />
          <Amount.Crypto
            value={bnOrZero(cryptoAmountBaseUnit)
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
          <Flex flexDir='column'>
            <Amount.Fiat
              color='chakra-body-text'
              fontSize='sm'
              fontWeight='medium'
              value={fiatAmount}
            />
            <Amount.Percent
              fontSize='xs'
              value={bnOrZero(marketData[asset.assetId]?.changePercent24Hr).div(100).toString()}
              autoColor
            />
          </Flex>
        </Button>
        {rewardAssetIds && (
          <List style={{ marginTop: 0 }}>
            {underlyingAssetIds.map(underlyingAssetId => {
              if (!underlyingAssetBalances[underlyingAssetId]) return null
              return (
                <NestedAsset
                  isClaimableRewards={isClaimableRewards}
                  assetId={underlyingAssetId}
                  balances={underlyingAssetBalances[underlyingAssetId]}
                  onClick={() => handleClick(DefiAction.Claim)}
                  type='Underlying Asset'
                />
              )
            })}
          </List>
        )}
      </List>
    </Flex>
  )
}
