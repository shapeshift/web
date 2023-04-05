import { Avatar, Tag } from '@chakra-ui/react'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { DefiProviderMetadata } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { Amount } from 'components/Amount/Amount'
import { Card } from 'components/Card/Card'
import { StakingPositionsByAsset } from 'components/EarnDashboard/components/ProviderDetails/StakingOpportunitiesByAsset'
import { RawText } from 'components/Text'
import type { AggregatedOpportunitiesByProviderReturn } from 'state/slices/opportunitiesSlice/types'

export const ProviderCard: React.FC<AggregatedOpportunitiesByProviderReturn> = ({
  provider,
  fiatAmount,
  apy,
  fiatRewardsAmount,
  opportunities: { staking },
}) => {
  const { icon, type } = DefiProviderMetadata[provider]
  const netProviderFiatAmount = bnOrZero(fiatAmount).plus(fiatRewardsAmount).toString()
  return (
    <Card>
      <Card.Header display='flex' gap={4} alignItems='center' fontSize='xl' fontWeight='bold'>
        <Avatar src={icon} size='sm' />
        <RawText textTransform='capitalize'>{provider}</RawText>
        <Amount.Fiat value={netProviderFiatAmount} />
        <Tag colorScheme='green'>
          <Amount.Percent value={apy} /> Net APY
        </Tag>
      </Card.Header>
      <Card.Body px={2}>
        <StakingPositionsByAsset ids={staking} />
      </Card.Body>
    </Card>
  )
}
