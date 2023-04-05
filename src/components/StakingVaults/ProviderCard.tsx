import { Skeleton, SkeletonCircle, Tag } from '@chakra-ui/react'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { DefiProviderMetadata } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { Amount } from 'components/Amount/Amount'
import { Card } from 'components/Card/Card'
import { WalletStakingByAsset } from 'components/EarnDashboard/components/ProviderDetails/WalletStakingByAsset'
import { LazyLoadAvatar } from 'components/LazyLoadAvatar'
import { RawText } from 'components/Text'
import type { AggregatedOpportunitiesByProviderReturn } from 'state/slices/opportunitiesSlice/types'

type ProviderCardProps = {
  isLoading?: boolean
} & AggregatedOpportunitiesByProviderReturn

export const ProviderCard: React.FC<ProviderCardProps> = ({
  provider,
  fiatAmount,
  apy,
  fiatRewardsAmount,
  opportunities: { staking },
  isLoading,
}) => {
  const { icon } = DefiProviderMetadata[provider]
  const netProviderFiatAmount = bnOrZero(fiatAmount).plus(fiatRewardsAmount).toString()
  const isLoaded = !isLoading
  return (
    <Card>
      <Card.Header display='flex' gap={4} alignItems='center' fontSize='xl' fontWeight='bold'>
        <SkeletonCircle isLoaded={isLoaded}>
          <LazyLoadAvatar src={icon} size='sm' />
        </SkeletonCircle>
        <RawText textTransform='capitalize'>{provider}</RawText>
        <Amount.Fiat value={netProviderFiatAmount} />
        <Tag colorScheme='green'>
          <Amount.Percent value={apy} /> Net APY
        </Tag>
      </Card.Header>
      <Card.Body px={2} pb={2}>
        <WalletStakingByAsset ids={staking} />
      </Card.Body>
    </Card>
  )
}

export const ProviderCardLoading: React.FC = () => {
  return (
    <Card>
      <Card.Header display='flex' gap={4} alignItems='center' fontSize='xl' fontWeight='bold'>
        <SkeletonCircle>
          <LazyLoadAvatar size='sm' />
        </SkeletonCircle>
        <Skeleton>
          <RawText textTransform='capitalize'>Loading</RawText>
        </Skeleton>
        <Skeleton>
          <Amount.Fiat value='0' />
        </Skeleton>
        <Skeleton>
          <Tag colorScheme='green'>
            <Amount.Percent value='0' /> Net APY
          </Tag>
        </Skeleton>
      </Card.Header>
    </Card>
  )
}
