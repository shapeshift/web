import { Flex, Skeleton, Stack, StackDivider, useColorModeValue } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { Amount } from 'components/Amount/Amount'
import { Card } from 'components/Card/Card'
import type { OpportunityId } from 'state/slices/opportunitiesSlice/types'
import {
  selectAssets,
  selectCryptoHumanBalanceIncludingStakingByFilter,
  selectEquityRowsfromFilter,
  selectFiatBalanceIncludingStakingByFilter,
  selectPortfolioLoading,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { EquityAccountRow } from './EquityAccountRow'
import { EquityLpRow } from './EquityLpRow'
import { EquityRowLoading } from './EquityRow'
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
  const portfolioLoading = useSelector(selectPortfolioLoading)
  const assets = useAppSelector(selectAssets)
  const asset = assets[assetId]
  const borderColor = useColorModeValue('blackAlpha.50', 'whiteAlpha.50')
  const filter = useMemo(() => {
    return {
      assetId,
      ...(accountId ? { accountId } : {}),
    }
  }, [accountId, assetId])

  const totalFiatBalance = useAppSelector(s => selectFiatBalanceIncludingStakingByFilter(s, filter))
  const cryptoHumanBalance = useAppSelector(s =>
    selectCryptoHumanBalanceIncludingStakingByFilter(s, filter),
  )

  const equityRows = useAppSelector(state => selectEquityRowsfromFilter(state, filter))

  const renderEquityRows = useMemo(() => {
    if (portfolioLoading)
      return Array.from({ length: 4 }).map((_, index) => (
        <EquityRowLoading key={`eq-row-loading-${index}`} />
      ))
    return equityRows.map(item => {
      switch (item.type) {
        case AssetEquityType.Staking:
          return (
            <EquityStakingRow
              key={item.id}
              assetId={assetId}
              opportunityId={item.id as OpportunityId}
              allocation={item.allocation}
              color={item.color}
              accountId={accountId}
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
              accountId={accountId}
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
  }, [accountId, assetId, equityRows, portfolioLoading])

  if (!asset) return null

  return (
    <Card variant='default'>
      <Card.Header display='flex' gap={4} alignItems='center'>
        <Flex flexDir='column' flex={1}>
          <Card.Heading>{translate('common.balance')}</Card.Heading>
          <Skeleton isLoaded={!portfolioLoading}>
            <Amount.Fiat fontSize='xl' value={totalFiatBalance} />
          </Skeleton>
          <Skeleton isLoaded={!portfolioLoading}>
            <Amount.Crypto variant='sub-text' value={cryptoHumanBalance} symbol={asset.symbol} />
          </Skeleton>
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
