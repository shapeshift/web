import {
  Card,
  CardBody,
  CardHeader,
  Flex,
  List,
  ListItem,
  Skeleton,
  SkeletonCircle,
  Tag,
} from '@chakra-ui/react'
import { Amount } from 'components/Amount/Amount'
import { opportunityRowGrid } from 'components/EarnDashboard/components/ProviderDetails/OpportunityTableHeader'
import { WalletLpByAsset } from 'components/EarnDashboard/components/ProviderDetails/WalletLpByAsset'
import { WalletStakingByAsset } from 'components/EarnDashboard/components/ProviderDetails/WalletStakingByAsset'
import { LazyLoadAvatar } from 'components/LazyLoadAvatar'
import { RawText } from 'components/Text'
import type { AggregatedOpportunitiesByProviderReturn } from 'state/slices/opportunitiesSlice/types'
import { getMetadataForProvider } from 'state/slices/opportunitiesSlice/utils/getMetadataForProvider'

type ProviderCardProps = {
  isLoading?: boolean
} & AggregatedOpportunitiesByProviderReturn

export const ProviderCard: React.FC<ProviderCardProps> = ({
  provider,
  apy,
  netProviderFiatAmount,
  opportunities: { staking, lp },
  isLoading,
}) => {
  const icon = getMetadataForProvider(provider)?.icon
  const isLoaded = !isLoading
  return (
    <Card variant='outline'>
      <CardHeader
        display='flex'
        bg='background.surface.raised.base'
        borderTopLeftRadius={{ base: 0, md: '2xl' }}
        borderTopRightRadius={{ base: '0', md: '2xl' }}
        flexDir={{ base: 'column', md: 'row' }}
        gap={4}
        alignItems={{ base: 'flex-start', md: 'center' }}
        fontSize={{ base: 'md', md: 'xl' }}
        fontWeight='bold'
        position='sticky'
        top='71px'
        zIndex='sticky'
      >
        <Flex
          width='full'
          gap={{ base: 2, md: 4 }}
          alignItems='center'
          justifyContent='space-between'
        >
          <SkeletonCircle isLoaded={isLoaded}>
            <LazyLoadAvatar src={icon} size='sm' />
          </SkeletonCircle>
          <RawText textTransform='capitalize'>{provider}</RawText>
          <Amount.Fiat
            fontSize='lg'
            value={netProviderFiatAmount}
            display={{ base: 'none', md: 'block' }}
          />
          <Tag colorScheme='green' ml='auto'>
            <Amount.Percent value={apy} suffix='Net APY' />
          </Tag>
        </Flex>

        <Amount.Fiat
          fontSize='lg'
          value={netProviderFiatAmount}
          display={{ base: 'block', md: 'none' }}
        />
      </CardHeader>
      <CardBody px={0} pb={2} pt={0}>
        <WalletStakingByAsset ids={staking} />
        <WalletLpByAsset ids={lp} />
      </CardBody>
    </Card>
  )
}

export const ProviderCardLoading: React.FC = () => {
  return (
    <Card>
      <CardHeader display='flex' gap={4} alignItems='center' fontSize='xl' fontWeight='bold'>
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
      </CardHeader>
      <CardBody px={0} pb={2} pt={0}>
        <Flex flexDir='column' gap={8}>
          <List ml={0} mt={0} spacing={4} position='relative'>
            <ListItem
              display='grid'
              columnGap={4}
              gridTemplateColumns={opportunityRowGrid}
              px={{ base: 4, md: 6 }}
              py={4}
            >
              <Flex alignItems='center' gap={4}>
                <SkeletonCircle>
                  <LazyLoadAvatar size='sm' />
                </SkeletonCircle>
                <Skeleton>
                  <RawText textTransform='capitalize'>I'm a pirate arggg!</RawText>
                </Skeleton>
              </Flex>
              <Skeleton display={{ base: 'none', md: 'block' }}>
                <RawText textTransform='capitalize'>Loading</RawText>
              </Skeleton>
              <Skeleton>
                <RawText textTransform='capitalize'>Loading</RawText>
              </Skeleton>
            </ListItem>
          </List>
        </Flex>
      </CardBody>
    </Card>
  )
}
