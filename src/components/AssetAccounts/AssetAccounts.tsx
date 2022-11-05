import { Grid, Stack } from '@chakra-ui/react'
import type { AssetId } from '@keepkey/caip'
import { useTranslate } from 'react-polyglot'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import type { AccountSpecifier } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import { selectAccountIdsByAssetIdAboveBalanceThreshold } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AssetAccountRow } from './AssetAccountRow'

type AssetAccountsProps = {
  assetId: AssetId
  accountId?: AccountSpecifier
}

export const AssetAccounts = ({ assetId, accountId }: AssetAccountsProps) => {
  const translate = useTranslate()
  const accountIds = useAppSelector(state =>
    selectAccountIdsByAssetIdAboveBalanceThreshold(state, { assetId }),
  )
  if ((accountIds && accountIds.length === 0) || accountId) return null
  return (
    <Card>
      <Card.Header>
        <Card.Heading>
          {translate('assets.assetDetails.assetAccounts.assetAllocation')}
        </Card.Heading>
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
            lineHeight='shorter'
          >
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
          {accountIds.map(accountId => (
            <AssetAccountRow
              accountId={accountId}
              assetId={assetId}
              key={accountId}
              showAllocation
            />
          ))}
        </Stack>
      </Card.Body>
    </Card>
  )
}
