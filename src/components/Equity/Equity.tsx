import { Flex, Stack } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { Card } from 'components/Card/Card'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { OpportunityId } from 'state/slices/opportunitiesSlice/types'
import {
  selectAccountIdsByAssetIdAboveBalanceThreshold,
  selectAllEarnUserLpOpportunitiesByAccountId,
  selectAssets,
  selectCryptoHumanBalanceIncludingStakingByFilter,
  selectFiatBalanceIncludingStakingByFilter,
  selectMarketDataSortedByMarketCap,
  selectPortfolioFiatBalancesByAccount,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { EquityAccountRow } from './EquityAccountRow'
import { EquityLpRow } from './EquityLpRow'
import { StakingRow } from './StakingRow'

type EquityProps = {
  assetId: AssetId
  accountId?: AccountId
}

enum AssetEquityType {
  Account = 'Account',
  Staking = 'Staking',
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
  const test = useAppSelector(state =>
    selectAllEarnUserLpOpportunitiesByAccountId(state, { accountId }),
  )
  console.info('fak', test)

  const equityItems = useMemo(() => {
    const accounts = accountIds.map(accountId => {
      return {
        id: accountId,
        type: AssetEquityType.Account,
        fiatAmount: portfolioFiatBalances[accountId][assetId],
      }
    })
    const staking = test.map(stakingOpportunity => {
      return {
        id: stakingOpportunity.id,
        type: stakingOpportunity.type,
        fiatAmount: stakingOpportunity.fiatAmount,
      }
    })
    return [...accounts, ...staking].sort((a, b) =>
      bnOrZero(b.fiatAmount).minus(a.fiatAmount).toNumber(),
    )
  }, [accountIds, assetId, portfolioFiatBalances, test])
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
            <StakingRow key={item.id} assetId={assetId} opportunityId={item.id as OpportunityId} />
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
      <Card.Header>
        <Card.Heading>{translate('assets.assetCards.equity')}</Card.Heading>
        <Amount.Fiat fontSize='xl' value={fiatBalance} />
        <Amount.Crypto variant='sub-text' value={cryptoHumanBalance} symbol={asset.symbol} />
      </Card.Header>
      <Card.Body pt={0} pb={2}>
        <Stack spacing={0} mt={2} mx={-4}>
          {renderEquityRows}
        </Stack>
      </Card.Body>
    </Card>
  )
}
