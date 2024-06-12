import type { ResponsiveValue } from '@chakra-ui/react'
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
import type { Property } from 'csstype'
import { useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { opportunityRowGrid } from 'components/EarnDashboard/components/ProviderDetails/OpportunityTableHeader'
import { WalletLpByAsset } from 'components/EarnDashboard/components/ProviderDetails/WalletLpByAsset'
import { WalletStakingByAsset } from 'components/EarnDashboard/components/ProviderDetails/WalletStakingByAsset'
import { LazyLoadAvatar } from 'components/LazyLoadAvatar'
import { RawText } from 'components/Text'
import { useIsSnapInstalled } from 'hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useWallet } from 'hooks/useWallet/useWallet'
import { walletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import type {
  AggregatedOpportunitiesByProviderReturn,
  OpportunityId,
} from 'state/slices/opportunitiesSlice/types'
import { getMetadataForProvider } from 'state/slices/opportunitiesSlice/utils/getMetadataForProvider'
import {
  selectAccountIdsByChainId,
  selectAggregatedEarnUserLpOpportunities,
  selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type ProviderCardProps = {
  isLoading?: boolean
} & AggregatedOpportunitiesByProviderReturn

const borderTopLeftRadius = { base: 0, md: '2xl' }
const borderTopRightRadius = { base: 0, md: '2xl' }
const flexDirMdRow: ResponsiveValue<Property.FlexDirection> = { base: 'column', md: 'row' }
const alignItemsMdCenter = { base: 'flex-start', md: 'center' }
const fontSize = { base: 'md', md: 'xl' }
const flexGap = { base: 2, md: 4 }
const listItemPaddingX = { base: 4, md: 6 }
const displayMdBlock = { base: 'none', md: 'block' }

export const ProviderCard: React.FC<ProviderCardProps> = ({
  provider,
  apy,
  netProviderFiatAmount,
  opportunities: { staking, lp },
  isLoading,
}) => {
  const accountIdsByChainId = useAppSelector(selectAccountIdsByChainId)
  const icon = getMetadataForProvider(provider)?.icon
  const isLoaded = !isLoading

  const {
    state: { wallet },
  } = useWallet()

  const stakingOpportunities = useAppSelector(
    selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
  )

  const isSnapInstalled = useIsSnapInstalled()

  const filteredDownStakingOpportunities = useMemo(
    () =>
      stakingOpportunities.filter(e => {
        const chainAccountIds = accountIdsByChainId[e.chainId] ?? []

        return (
          staking.includes(e.id as OpportunityId) &&
          walletSupportsChain({
            chainId: e.chainId,
            wallet,
            isSnapInstalled,
            checkConnectedAccountIds: chainAccountIds,
          })
        )
      }),
    [accountIdsByChainId, isSnapInstalled, staking, stakingOpportunities, wallet],
  )

  const lpOpportunities = useAppSelector(selectAggregatedEarnUserLpOpportunities)

  const filteredDownLpOpportunities = useMemo(
    () =>
      lpOpportunities.filter(e => {
        const chainAccountIds = accountIdsByChainId[e.chainId] ?? []

        return (
          lp.includes(e.assetId as OpportunityId) &&
          walletSupportsChain({
            chainId: e.chainId,
            wallet,
            isSnapInstalled,
            checkConnectedAccountIds: chainAccountIds,
          })
        )
      }),
    [accountIdsByChainId, isSnapInstalled, lp, lpOpportunities, wallet],
  )

  if (!filteredDownLpOpportunities.length && !filteredDownStakingOpportunities.length) return null

  return (
    <Card variant='dashboard'>
      <CardHeader
        display='flex'
        bg='background.surface.raised.base'
        borderTopLeftRadius={borderTopLeftRadius}
        borderTopRightRadius={borderTopRightRadius}
        flexDir={flexDirMdRow}
        gap={4}
        alignItems={alignItemsMdCenter}
        fontSize={fontSize}
        fontWeight='bold'
      >
        <Flex width='full' gap={flexGap} alignItems='center' justifyContent='space-between'>
          <SkeletonCircle isLoaded={isLoaded}>
            <LazyLoadAvatar src={icon} size='sm' />
          </SkeletonCircle>
          <RawText textTransform='capitalize'>{provider}</RawText>
          <Amount.Fiat fontSize='lg' value={netProviderFiatAmount} display={displayMdBlock} />
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
        <WalletStakingByAsset opportunities={filteredDownStakingOpportunities} />
        <WalletLpByAsset opportunities={filteredDownLpOpportunities} />
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
              px={listItemPaddingX}
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
              <Skeleton display={displayMdBlock}>
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
