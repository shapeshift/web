import { Flex, Stack } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import type { DefiProvider } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiProviderMetadata } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { Card } from 'components/Card/Card'
import { CircleIcon } from 'components/Icons/Circle'
import { RawText } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { OpportunityId } from 'state/slices/opportunitiesSlice/types'
import {
  selectAccountIdsByAssetIdAboveBalanceThreshold,
  selectAllEarnUserLpOpportunitiesByAccountId,
  selectAllEarnUserStakingOpportunitiesByAccountId,
  selectAssets,
  selectCryptoHumanBalanceIncludingStakingByFilter,
  selectFiatBalanceIncludingStakingByFilter,
  selectMarketDataSortedByMarketCap,
  selectPortfolioFiatBalancesByAccount,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { EquityAccountRow } from './EquityAccountRow'
import { EquityLpRow } from './EquityLpRow'
import { EquityStakingRow } from './EquityStakingRow'

type EquityProps = {
  assetId: AssetId
  accountId?: AccountId
}

enum AssetEquityType {
  Account = 'Account',
  Staking = 'staking',
  LP = 'lp',
  Reward = 'Reward',
}

export const Equity = ({ assetId, accountId }: EquityProps) => {
  const translate = useTranslate()
  const assets = useAppSelector(selectAssets)
  const asset = assets[assetId]
  const marketData = useAppSelector(selectMarketDataSortedByMarketCap)
  const accountIds = useAppSelector(state =>
    selectAccountIdsByAssetIdAboveBalanceThreshold(state, { assetId }),
  )
  const opportunitiesFilter = useMemo(() => ({ assetId, accountId }), [assetId, accountId])
  const fiatBalance = useAppSelector(s =>
    selectFiatBalanceIncludingStakingByFilter(s, opportunitiesFilter),
  )
  const cryptoHumanBalance = useAppSelector(s =>
    selectCryptoHumanBalanceIncludingStakingByFilter(s, opportunitiesFilter),
  )
  const portfolioFiatBalances = useAppSelector(selectPortfolioFiatBalancesByAccount)
  // const lpOpportunities = useAppSelector(state =>
  //   selectAllEarnUserLpOpportunitiesByAccountId(state, { accountId }),
  // )
  const filter = useMemo(() => {
    return {
      assetId,
      ...(accountId ? { accountId } : {}),
    }
  }, [accountId, assetId])
  const lpOpportunities = useAppSelector(state =>
    selectAllEarnUserLpOpportunitiesByAccountId(state, filter),
  )
  const stakingOpportunities = useAppSelector(state =>
    selectAllEarnUserStakingOpportunitiesByAccountId(state, { accountId }),
  )

  const equityItems = useMemo(() => {
    const accounts = accountIds.map(accountId => {
      const fiatAmount = portfolioFiatBalances[accountId][assetId]
      return {
        id: accountId,
        type: AssetEquityType.Account,
        fiatAmount,
        provider: 'wallet',
        allocation: bnOrZero(fiatAmount).div(fiatBalance).times(100).toString(),
        color: '#3761F9',
      }
    })
    const staking = stakingOpportunities.map(stakingOpportunity => {
      return {
        id: stakingOpportunity.id,
        type: stakingOpportunity.type,
        fiatAmount: stakingOpportunity.fiatAmount,
        allocation: bnOrZero(stakingOpportunity.fiatAmount).div(fiatBalance).times(100).toString(),
        provider: stakingOpportunity.provider,
        color: DefiProviderMetadata[stakingOpportunity.provider].color,
      }
    })
    const lp = lpOpportunities.map(stakingOpportunity => {
      return {
        id: stakingOpportunity.id,
        type: stakingOpportunity.type,
        fiatAmount: stakingOpportunity.fiatAmount,
        allocation: bnOrZero(stakingOpportunity.fiatAmount).div(fiatBalance).times(100).toString(),
        provider: stakingOpportunity.provider,
        color: DefiProviderMetadata[stakingOpportunity.provider].color,
      }
    })
    return [...accounts, ...lp, ...staking].sort((a, b) =>
      bnOrZero(b.fiatAmount).minus(a.fiatAmount).toNumber(),
    )
  }, [
    accountIds,
    assetId,
    fiatBalance,
    lpOpportunities,
    portfolioFiatBalances,
    stakingOpportunities,
  ])
  /*

    enum AssetEquityType {
      Account = 'Account',
      Staking = 'Staking,
      LP = 'LP',
      Reward = 'Reward
    }
    const data = [
      {
        type: AssetEquityType.Account,
        id: '',
        fiatAmount: ''
      }
    ]

  */
  const renderEquityRows = useMemo(() => {
    return equityItems.map(item => {
      switch (item.type) {
        case AssetEquityType.Staking:
          return (
            <EquityStakingRow
              key={item.id}
              assetId={assetId}
              opportunityId={item.id as OpportunityId}
            />
          )
        case AssetEquityType.LP:
          return (
            <EquityLpRow key={item.id} assetId={assetId} opportunityId={item.id as OpportunityId} />
          )
        case AssetEquityType.Account:
          return (
            <EquityAccountRow key={item.id} assetId={assetId} accountId={item.id as AccountId} />
          )
        default:
          return (
            <Flex key={item.id}>
              {item.type} {item.fiatAmount}
            </Flex>
          )
      }
    })
  }, [assetId, equityItems])

  if (!asset) return null
  return (
    <Card variant='default'>
      <Card.Header display='flex' gap={4} alignItems='center'>
        <Flex flexDir='column' flex={1}>
          <Card.Heading>{translate('assets.assetCards.equity')}</Card.Heading>
          <Amount.Fiat fontSize='xl' value={fiatBalance} />
          <Amount.Crypto variant='sub-text' value={cryptoHumanBalance} symbol={asset.symbol} />
        </Flex>
        <Flex flex={1} flexDir='column' gap={2}>
          <Flex
            bg='gray.700'
            height='10px'
            borderRadius='lg'
            overflow='hidden'
            gap={1}
            width='full'
          >
            {equityItems.map(item => (
              <Flex width={`${item.allocation}%`} bg={item.color} />
            ))}
          </Flex>
          <Flex gap={4}>
            {equityItems.map(item => (
              <Flex gap={1} alignItems='center'>
                <CircleIcon boxSize='8px' color={item.color} />
                <RawText fontSize='xs'>{item.provider}</RawText>
              </Flex>
            ))}
          </Flex>
        </Flex>
      </Card.Header>
      <Card.Body pt={0} pb={2}>
        <Stack spacing={0} mt={2} mx={-4}>
          {renderEquityRows}
        </Stack>
      </Card.Body>
    </Card>
  )
}
