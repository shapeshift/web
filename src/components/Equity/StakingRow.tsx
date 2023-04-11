import { Button, Flex } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { assetIdToCoinCap } from '@shapeshiftoss/caip/src/adapters'
import { DefiProviderMetadata } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import React from 'react'
import { Amount } from 'components/Amount/Amount'
import { LazyLoadAvatar } from 'components/LazyLoadAvatar'
import { RawText } from 'components/Text'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { OpportunityId } from 'state/slices/opportunitiesSlice/types'
import {
  selectAggregatedEarnUserStakingOpportunities,
  selectAssetById,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type StakingRowProps = {
  opportunityId: OpportunityId
  assetId: AssetId
}
export const StakingRow: React.FC<StakingRowProps> = ({ opportunityId, assetId }) => {
  const stakingOpportunities = useAppSelector(selectAggregatedEarnUserStakingOpportunities)
  const opportunity = stakingOpportunities.find(opportunity => opportunity.id === opportunityId)
  const asset = useAppSelector(state => selectAssetById(state, assetId))
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
          <Amount.Fiat value={opportunity.fiatAmount} />
          <Amount.Crypto
            value={bnOrZero(opportunity.cryptoAmountBaseUnit)
              .div(bn(10).pow(asset.precision))
              .decimalPlaces(asset.precision)
              .toFixed(asset.precision)}
            symbol={asset.symbol}
            _before={{ content: "'('" }}
            _after={{ content: "')'" }}
          />
        </Flex>
      </Flex>
    </Button>
  )
}
