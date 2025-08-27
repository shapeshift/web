import {
  Card,
  CardBody,
  CardHeader,
  Flex,
  Heading,
  HStack,
  SimpleGrid,
  Skeleton,
} from '@chakra-ui/react'
import { tcyAssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import { Suspense, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { useTcyDistributor } from '../queries/useTcyDistributooor'
import { useTcyStaker } from '../queries/useTcyStaker'
import type { CurrentAccount } from '../tcy'
import type { TCYRouteProps } from '../types'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { RawText } from '@/components/Text'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { fromBaseUnit } from '@/lib/math'
import { THOR_PRECISION } from '@/lib/utils/thorchain/constants'
import {
  selectAssetById,
  selectCryptoHumanBalanceFilter,
  selectMarketDataByAssetIdUserCurrency,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type OverviewProps = TCYRouteProps & {
  currentAccount: CurrentAccount
}

const gridColumns = { base: 1, md: 2 }

const StakedBalance = ({ accountId }: { accountId: string | undefined }) => {
  const translate = useTranslate()
  const tcyAsset = useAppSelector(state => selectAssetById(state, tcyAssetId))
  const tcyMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, tcyAssetId),
  )

  const { data: staker } = useTcyStaker(accountId)

  const amountCryptoPrecision = fromBaseUnit(staker?.amount ?? '0', THOR_PRECISION)
  const amountUserCurrency = bnOrZero(amountCryptoPrecision)
    .times(bnOrZero(tcyMarketData?.price))
    .toFixed(2)

  if (!tcyAsset) return null

  return (
    <Flex flexDir='column' alignItems='flex-start'>
      <HelperTooltip label={translate('TCY.myStakedBalanceHelper', { symbol: tcyAsset.symbol })}>
        <RawText color='text.subtle'>{translate('TCY.myStakedBalance')}</RawText>
      </HelperTooltip>
      <Amount.Crypto value={amountCryptoPrecision} symbol={tcyAsset.symbol} fontSize='2xl' />
      <Amount.Fiat value={amountUserCurrency} fontSize='sm' color='text.subtle' />
    </Flex>
  )
}

const RewardsBalance = ({ accountId }: { accountId: string | undefined }) => {
  const translate = useTranslate()
  const runeAsset = useAppSelector(state => selectAssetById(state, thorchainAssetId))
  const runeMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, thorchainAssetId),
  )

  const { data: distributor } = useTcyDistributor(accountId)

  const amountCryptoPrecision = fromBaseUnit(distributor?.total ?? '0', THOR_PRECISION)
  const amountUserCurrency = bnOrZero(amountCryptoPrecision)
    .times(bnOrZero(runeMarketData?.price))
    .toFixed(2)

  if (!runeAsset) return null

  return (
    <Flex flexDir='column' alignItems='flex-start'>
      <HelperTooltip label={translate('TCY.myRewardsBalanceHelper', { symbol: runeAsset.symbol })}>
        <RawText color='text.subtle'>{translate('TCY.myRewardsBalance')}</RawText>
      </HelperTooltip>
      <Amount.Crypto value={amountCryptoPrecision} symbol={runeAsset.symbol} fontSize='2xl' />
      <Amount.Fiat value={amountUserCurrency} fontSize='sm' color='text.subtle' />
    </Flex>
  )
}

const StakedBalanceSkeleton = () => {
  const translate = useTranslate()
  const tcyAsset = useAppSelector(state => selectAssetById(state, tcyAssetId))

  if (!tcyAsset) return null

  return (
    <Flex flexDir='column' alignItems='flex-start'>
      <HelperTooltip label={translate('TCY.myStakedBalanceHelper', { symbol: tcyAsset.symbol })}>
        <RawText color='text.subtle'>{translate('TCY.myStakedBalance')}</RawText>
      </HelperTooltip>
      <Skeleton height='24px' width='120px' mb={1} />
      <Skeleton height='16px' width='80px' />
    </Flex>
  )
}

const RewardsBalanceSkeleton = () => {
  const translate = useTranslate()
  const runeAsset = useAppSelector(state => selectAssetById(state, thorchainAssetId))

  if (!runeAsset) return null

  return (
    <Flex flexDir='column' alignItems='flex-start'>
      <HelperTooltip label={translate('TCY.myRewardsBalanceHelper', { symbol: runeAsset.symbol })}>
        <RawText color='text.subtle'>{translate('TCY.myRewardsBalance')}</RawText>
      </HelperTooltip>
      <Skeleton height='24px' width='120px' mb={1} />
      <Skeleton height='16px' width='80px' />
    </Flex>
  )
}

const stakedBalanceSkeleton = <StakedBalanceSkeleton />
const rewardsBalanceSkeleton = <RewardsBalanceSkeleton />

export const Overview = ({ currentAccount }: OverviewProps) => {
  const translate = useTranslate()

  const tcyAsset = useAppSelector(state => selectAssetById(state, tcyAssetId))
  const accountId = currentAccount.accountId

  const filter = useMemo(() => ({ assetId: tcyAssetId, accountId }), [accountId])

  const tcyCryptoHumanBalance = useAppSelector(s => selectCryptoHumanBalanceFilter(s, filter))

  if (!tcyAsset) return null

  return (
    <Card>
      <CardHeader>
        <HStack>
          <AssetIcon assetId={tcyAssetId} />
          <Amount.Crypto value={tcyCryptoHumanBalance} symbol={tcyAsset.symbol} fontSize='2xl' />
        </HStack>
      </CardHeader>
      <CardBody pb={6}>
        <Heading size='sm' mb={6}>
          {translate('TCY.myPosition')}
        </Heading>
        <SimpleGrid spacing={6} columns={gridColumns}>
          <Suspense fallback={stakedBalanceSkeleton}>
            <StakedBalance accountId={accountId} />
          </Suspense>
          <Suspense fallback={rewardsBalanceSkeleton}>
            <RewardsBalance accountId={accountId} />
          </Suspense>
        </SimpleGrid>
      </CardBody>
    </Card>
  )
}
