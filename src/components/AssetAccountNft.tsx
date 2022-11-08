import { Box, Button, Flex, Grid, HStack, Stack } from '@chakra-ui/react'
import type { AssetId } from '@keepkey/caip'
import { useMemo } from 'react'
import type { Route } from 'Routes/helpers'
import { AssetTransactionHistory } from 'components/TransactionHistory/AssetTransactionHistory'
import { TradeCard } from 'pages/Dashboard/TradeCard'
import type { AccountSpecifier } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import { selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AccountAssets } from './AccountAssets/AccountAssets'
import { AssetAccounts } from './AssetAccounts/AssetAccounts'
import { AssetChart } from './AssetHeader/AssetChart'
import { AssetDescription } from './AssetHeader/AssetDescription'
import { AssetHeader } from './AssetHeader/AssetHeader'
import { AssetMarketData } from './AssetHeader/AssetMarketData'
import { Main } from './Layout/Main'
import { MaybeChartUnavailable } from './MaybeChartUnavailable'
import { EarnOpportunities } from './StakingVaults/EarnOpportunities'
import { UnderlyingToken } from './UnderlyingToken'
import { Card } from './Card/Card'
import { Text } from './Text/Text'
import { useTranslate } from 'react-polyglot'

type AssetDetailsProps = {
  assetId: AssetId
  accountId?: AccountSpecifier
  route?: Route
}

export const AssetAccountNft = ({ assetId, accountId }: AssetDetailsProps) => {
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const assetIds = useMemo(() => [assetId], [assetId])
  const translate = useTranslate()

  if (assetId !== 'eip155:1/slip44:60') return null

  return (
    <Card>
      <Card.Header>
        <Card.Heading>{translate('assets.assetDetails.nft.nftAllocation')}</Card.Heading>
      </Card.Header>
      <Card.Body pt={0}>
        <Stack spacing={2} mt={2} mx={-4}>
          <Grid
            templateColumns={{
              base: '1fr 1fr',
              md: '1fr 1fr 1fr',
              lg: '2fr 150px repeat(2, 1fr)',
            }}
            gap='1rem'
            pl={4}
            pr={4}
            fontSize='sm'
            lineHeight='shorter'>
            <Text translation='assets.assetDetails.assetAccounts.account' color='gray.500' />
            <Text
              translation='assets.assetDetails.assetAccounts.allocation'
              color='gray.500'
              textAlign='right'
              display={{ base: 'none', lg: 'block' }}
            />
            <Text
              translation='assets.assetDetails.assetAccounts.amount'
              display={{ base: 'none', md: 'block', lg: 'block' }}
              color='gray.500'
              textAlign='right'
            />
            <Text
              translation='assets.assetDetails.assetAccounts.value'
              textAlign='right'
              color='gray.500'
            />
          </Grid>
          {/* {accountIds.map(accountId => (
            <AssetAccountRow
              accountId={accountId}
              assetId={assetId}
              key={accountId}
              showAllocation
            />
          ))} */}
        </Stack>
      </Card.Body>
    </Card>
  )
}
