import { Button } from '@chakra-ui/react'
import { DefiProvider } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import type { EarnOpportunityType } from 'features/defi/helpers/normalizeOpportunity'
import { useTranslate } from 'react-polyglot'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type StakingCardProps = {
  onClick: (arg: EarnOpportunityType) => void
} & EarnOpportunityType

export const StakingCard: React.FC<StakingCardProps> = props => {
  const translate = useTranslate()
  const { onClick, ...rest } = props
  const { assetId, underlyingAssetId, provider, apy, moniker } = rest
  const currentAssetId = underlyingAssetId ?? assetId
  const asset = useAppSelector(state => selectAssetById(state, currentAssetId ?? ''))
  const opportunityApy = `${bnOrZero(apy).times(100).toFixed(2)}%`
  const providerName =
    provider === (DefiProvider.Cosmos || DefiProvider.Osmosis) ? moniker : provider

  return (
    <Card bg='whiteAlpha.50' borderColor='whiteAlpha.100'>
      <Card.Body display='flex' flexDir='column' gap={4}>
        <AssetIcon assetId={currentAssetId} />
        <Text
          fontSize='xl'
          fontWeight='bold'
          translation={['arkeo.staking.title', { asset: asset?.name }]}
        />
        <Text
          color='gray.500'
          translation={[
            'arkeo.staking.body',
            { asset: asset?.name, apy: opportunityApy, provider: providerName },
          ]}
        />
        <Button width='full' colorScheme='blue' mt='auto' onClick={() => onClick(rest)}>
          {translate('arkeo.staking.cta', { asset: asset?.name })}
        </Button>
      </Card.Body>
    </Card>
  )
}
