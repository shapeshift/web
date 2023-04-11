import { Button, Flex } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { DefiProviderMetadata } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import React from 'react'
import { Amount } from 'components/Amount/Amount'
import { LazyLoadAvatar } from 'components/LazyLoadAvatar'
import { RawText } from 'components/Text'
import type { OpportunityId } from 'state/slices/opportunitiesSlice/types'
import { getUnderlyingAssetIdsBalances } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAggregatedEarnUserLpOpportunities,
  selectAssetById,
  selectAssets,
  selectMarketDataSortedByMarketCap,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type EquityLpRowProps = {
  opportunityId: OpportunityId
  assetId: AssetId
}
export const EquityLpRow: React.FC<EquityLpRowProps> = ({ opportunityId, assetId }) => {
  const assets = useAppSelector(selectAssets)
  const marketData = useAppSelector(selectMarketDataSortedByMarketCap)
  const lpOpportunities = useAppSelector(selectAggregatedEarnUserLpOpportunities)
  const opportunity = lpOpportunities.find(opportunity => opportunity.id === opportunityId)
  const asset = useAppSelector(state => selectAssetById(state, assetId))

  if (!opportunity) throw new Error(`No opportunity found for ${assetId}`)
  if (!assetId) throw new Error(`No assetId ${assetId}`)

  const underlyingBalances = getUnderlyingAssetIdsBalances({
    underlyingAssetIds: opportunity.underlyingAssetIds,
    underlyingAssetRatiosBaseUnit: opportunity.underlyingAssetRatiosBaseUnit,
    cryptoAmountBaseUnit: opportunity.cryptoAmountBaseUnit,
    assetId,
    assets,
    marketData,
  })

  if (!opportunity || !asset) return null

  return (
    <Button
      height='auto'
      py={4}
      variant='ghost'
      justifyContent='flex-start'
      alignItems='center'
      display='flex'
      gap={4}
    >
      <LazyLoadAvatar src={DefiProviderMetadata[opportunity.provider].icon} />
      <Flex flexDir='column' alignItems='flex-start'>
        <RawText color='chakra-body-text'>{opportunity.provider}</RawText>
        <Flex fontWeight='medium' fontSize='sm' gap={1}>
          <Amount.Fiat value={underlyingBalances[assetId]?.fiatAmount} />
          <Amount.Crypto
            value={underlyingBalances[assetId]?.cryptoBalancePrecision}
            symbol={asset.symbol}
            _before={{ content: "'('" }}
            _after={{ content: "')'" }}
          />
        </Flex>
      </Flex>
    </Button>
  )
}
