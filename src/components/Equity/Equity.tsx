import { Flex, Stack, StackDivider, useColorModeValue } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { DefiProviderMetadata } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { Card } from 'components/Card/Card'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { OpportunityId } from 'state/slices/opportunitiesSlice/types'
import {
  selectAccountIdsByAssetIdAboveBalanceThreshold,
  selectAllEarnUserLpOpportunitiesByAccountId,
  selectAllEarnUserStakingOpportunitiesByFilter,
  selectAssets,
  selectCryptoHumanBalanceIncludingStakingByFilter,
  selectFiatBalanceIncludingStakingByFilter,
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
  Staking = 'Staking',
  LP = 'LP',
  Reward = 'Reward',
}

export const Equity = ({ assetId, accountId }: EquityProps) => {
  const translate = useTranslate()
  const assets = useAppSelector(selectAssets)
  const asset = assets[assetId]
  const borderColor = useColorModeValue('blackAlpha.50', 'whiteAlpha.50')
  const accountIds = useAppSelector(state =>
    selectAccountIdsByAssetIdAboveBalanceThreshold(state, { assetId }),
  )
  const activeAccountList = useMemo(
    () => (accountId ? accountIds.filter(listAccount => listAccount === accountId) : accountIds),
    [accountId, accountIds],
  )
  const opportunitiesFilter = useMemo(() => ({ assetId, accountId }), [assetId, accountId])
  const totalFiatBalance = useAppSelector(s =>
    selectFiatBalanceIncludingStakingByFilter(s, opportunitiesFilter),
  )
  const cryptoHumanBalance = useAppSelector(s =>
    selectCryptoHumanBalanceIncludingStakingByFilter(s, opportunitiesFilter),
  )
  const portfolioFiatBalances = useAppSelector(selectPortfolioFiatBalancesByAccount)

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
    selectAllEarnUserStakingOpportunitiesByFilter(state, filter),
  )

  const equityItems = useMemo(() => {
    const accounts = activeAccountList.map(accountId => {
      const fiatAmount = bnOrZero(portfolioFiatBalances[accountId][assetId]).toString()
      const allocation = bnOrZero(
        bnOrZero(portfolioFiatBalances[accountId][assetId]).div(totalFiatBalance).times(100),
      ).toString()
      return {
        id: accountId,
        type: AssetEquityType.Account,
        fiatAmount,
        provider: 'wallet',
        allocation,
        color: asset?.color,
      }
    })
    const staking = stakingOpportunities.map(stakingOpportunity => {
      const allocation = bnOrZero(
        bnOrZero(stakingOpportunity.fiatAmount).div(totalFiatBalance).times(100),
      ).toString()
      return {
        id: stakingOpportunity.id,
        type: stakingOpportunity.type,
        fiatAmount: stakingOpportunity.fiatAmount,
        allocation,
        provider: stakingOpportunity.provider,
        color: DefiProviderMetadata[stakingOpportunity.provider].color,
      }
    })
    const lp = lpOpportunities.map(lpOpportunity => {
      const allocation = bnOrZero(
        bnOrZero(lpOpportunity.fiatAmount).div(totalFiatBalance).times(100),
      ).toString()
      return {
        id: lpOpportunity.id,
        type: lpOpportunity.type,
        fiatAmount: lpOpportunity.fiatAmount,
        allocation,
        provider: lpOpportunity.provider,
        color: DefiProviderMetadata[lpOpportunity.provider].color,
      }
    })
    return [...accounts, ...lp, ...staking].sort((a, b) =>
      bnOrZero(b.fiatAmount).minus(a.fiatAmount).toNumber(),
    )
  }, [
    activeAccountList,
    asset?.color,
    assetId,
    totalFiatBalance,
    lpOpportunities,
    portfolioFiatBalances,
    stakingOpportunities,
  ])

  const renderEquityRows = useMemo(() => {
    return equityItems.map(item => {
      switch (item.type) {
        case AssetEquityType.Staking:
          return (
            <EquityStakingRow
              key={item.id}
              assetId={assetId}
              opportunityId={item.id as OpportunityId}
              allocation={item.allocation}
              color={item.color}
            />
          )
        case AssetEquityType.LP:
          return (
            <EquityLpRow
              key={item.id}
              assetId={assetId}
              opportunityId={item.id as OpportunityId}
              allocation={item.allocation}
              color={item.color}
            />
          )
        case AssetEquityType.Account:
          return (
            <EquityAccountRow
              key={item.id}
              assetId={assetId}
              accountId={item.id as AccountId}
              allocation={item.allocation}
              color={item.color}
            />
          )
        default:
          return null
      }
    })
  }, [assetId, equityItems])

  if (!asset) return null
  return (
    <Card variant='default'>
      <Card.Header display='flex' gap={4} alignItems='center'>
        <Flex flexDir='column' flex={1}>
          <Card.Heading>{translate('common.balance')}</Card.Heading>
          <Amount.Fiat fontSize='xl' value={totalFiatBalance} />
          <Amount.Crypto variant='sub-text' value={cryptoHumanBalance} symbol={asset.symbol} />
        </Flex>
      </Card.Header>
      <Card.Body pt={0} pb={2}>
        <Stack
          spacing={0}
          mt={2}
          mx={-4}
          divider={<StackDivider borderColor={borderColor} style={{ marginLeft: 14 }} />}
        >
          {renderEquityRows}
        </Stack>
      </Card.Body>
    </Card>
  )
}
