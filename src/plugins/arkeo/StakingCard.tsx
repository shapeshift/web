import { Button, CardBody, Skeleton, SkeletonText } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { AssetIcon } from 'components/AssetIcon'
import { Text } from 'components/Text'
import type { TextPropTypes } from 'components/Text/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssetById } from 'state/selectors'
import type { EarnOpportunityType, OpportunityId } from 'state/slices/opportunitiesSlice/types'
import { DefiProvider } from 'state/slices/opportunitiesSlice/types'
import { useAppSelector } from 'state/store'

import { ArkeoCard } from './ArkeoCard'

type StakingCardProps = {
  onClick: (opportunityId: OpportunityId) => void
} & EarnOpportunityType

export const StakingCard: React.FC<StakingCardProps> = props => {
  const translate = useTranslate()
  const { onClick, ...opportunity } = props
  const { assetId, underlyingAssetId, provider, apy, isLoaded, opportunityName } = opportunity
  const currentAssetId = underlyingAssetId ?? assetId
  const asset = useAppSelector(state => selectAssetById(state, currentAssetId ?? ''))
  const opportunityApy = bnOrZero(apy).times(100).toFixed(2)
  const providerName =
    DefiProvider.CosmosSdk === (provider as DefiProvider)
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
      case DefiProvider.EthFoxStaking:
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

  const stakingCardTitle: TextPropTypes['translation'] = useMemo(
    () => [title, { asset: asset?.name }],
    [asset?.name, title],
  )

  const stakingCardBody: TextPropTypes['translation'] = useMemo(
    () => [body, { asset: asset?.name, apy: `${opportunityApy}%`, provider: providerName }],
    [asset?.name, body, opportunityApy, providerName],
  )

  const handleClick = useCallback(() => onClick(opportunity.id), [onClick, opportunity.id])

  return (
    <ArkeoCard>
      <CardBody display='flex' flexDir='column' gap={4} height='100%'>
        <AssetIcon assetId={currentAssetId} />
        <Text fontSize='xl' fontWeight='bold' translation={stakingCardTitle} />
        <SkeletonText noOfLines={4} isLoaded={isLoaded}>
          <Text color='text.subtle' translation={stakingCardBody} />
        </SkeletonText>
        <Skeleton isLoaded={isLoaded} mt='auto'>
          <Button width='full' colorScheme='blue' onClick={handleClick}>
            {translate(cta, { asset: asset?.name })}
          </Button>
        </Skeleton>
      </CardBody>
    </ArkeoCard>
  )
}
