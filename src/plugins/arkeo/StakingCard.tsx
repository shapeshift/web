import { Button, Skeleton, SkeletonText } from '@chakra-ui/react'
import { DefiProvider } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useTranslate } from 'react-polyglot'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { EarnOpportunityType, OpportunityId } from 'state/slices/opportunitiesSlice/types'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ArkeoCard } from './ArkeoCard'

type StakingCardProps = {
  onClick: (opportunityId: OpportunityId) => void
} & EarnOpportunityType

export const StakingCard: React.FC<StakingCardProps> = props => {
  const translate = useTranslate()
  const { onClick, ...opportunity } = props
  const { assetId, underlyingAssetId, provider, apy, opportunityName } = opportunity
  const currentAssetId = underlyingAssetId ?? assetId
  const asset = useAppSelector(state => selectAssetById(state, currentAssetId ?? ''))
  const opportunityApy = bnOrZero(apy).times(100).toFixed(2)
  const providerName = [DefiProvider.Cosmos, DefiProvider.Osmosis].includes(
    provider as DefiProvider,
  )
    ? translate('common.validator', { name: opportunityName })
    : provider

  const { title, body, cta } = (() => {
    switch (provider) {
      case DefiProvider.ShapeShift:
        return {
          title: 'arkeo.foxyTokenHolders.title',
          body: 'arkeo.foxyTokenHolders.body',
          cta: 'arkeo.foxyTokenHolders.cta',
        }
      case DefiProvider.FoxFarming:
        return {
          title: 'arkeo.foxFarmers.title',
          body: 'arkeo.foxFarmers.body',
          cta: 'arkeo.foxFarmers.cta',
        }
      default:
        return {
          title: 'arkeo.staking.title',
          body: 'arkeo.staking.body',
          cta: 'arkeo.staking.cta',
        }
    }
  })()

  return (
    <ArkeoCard>
      <Card.Body display='flex' flexDir='column' gap={4} height='100%'>
        <AssetIcon assetId={currentAssetId} />
        <Text fontSize='xl' fontWeight='bold' translation={[title, { asset: asset?.name }]} />
        <SkeletonText noOfLines={4} isLoaded={bnOrZero(opportunityApy).gt(0)}>
          <Text
            color='gray.500'
            translation={[
              body,
              { asset: asset?.name, apy: `${opportunityApy}%`, provider: providerName },
            ]}
          />
        </SkeletonText>
        <Skeleton isLoaded={bnOrZero(opportunityApy).gt(0)} mt='auto'>
          <Button width='full' colorScheme='blue' onClick={() => onClick(opportunity.id)}>
            {translate(cta, { asset: asset?.name })}
          </Button>
        </Skeleton>
      </Card.Body>
    </ArkeoCard>
  )
}
