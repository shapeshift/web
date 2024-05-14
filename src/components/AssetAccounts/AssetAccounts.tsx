import { Card, CardBody, CardHeader, Grid, Heading, Stack } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { useTranslate } from 'react-polyglot'
import { Text } from 'components/Text'
import { selectAccountIdsByAssetIdAboveBalanceThreshold } from 'state/selectors'
import { useAppSelector } from 'state/store'

import { AssetAccountRow } from './AssetAccountRow'

type AssetAccountsProps = {
  assetId: AssetId
  accountId?: AccountId
}

const gridTemplateColumns = {
  base: '1fr 1fr',
  md: '1fr 1fr 1fr',
  lg: '2fr 150px repeat(2, 1fr)',
}

const allocationTextDisplay = { base: 'none', lg: 'block' }
const amountTextDisplay = { base: 'none', md: 'block', lg: 'block' }

export const AssetAccounts = ({ assetId, accountId }: AssetAccountsProps) => {
  const translate = useTranslate()
  const accountIds = useAppSelector(state =>
    selectAccountIdsByAssetIdAboveBalanceThreshold(state, { assetId }),
  )
  if ((accountIds && accountIds.length === 0) || accountId) return null
  return (
    <Card>
      <CardHeader>
        <Heading as='h5'>{translate('assets.assetDetails.assetAccounts.assetAllocation')}</Heading>
      </CardHeader>
      <CardBody pt={0}>
        <Stack spacing={2} mt={2} mx={-4}>
          <Grid
            templateColumns={gridTemplateColumns}
            gap='1rem'
            pl={4}
            pr={4}
            fontSize='sm'
            lineHeight='shorter'
          >
            <Text translation='assets.assetDetails.assetAccounts.account' color='text.subtle' />
            <Text
              translation='assets.assetDetails.assetAccounts.allocation'
              color='text.subtle'
              textAlign='right'
              display={allocationTextDisplay}
            />
            <Text
              translation='assets.assetDetails.assetAccounts.amount'
              display={amountTextDisplay}
              color='text.subtle'
              textAlign='right'
            />
            <Text
              translation='assets.assetDetails.assetAccounts.value'
              textAlign='right'
              color='text.subtle'
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
      </CardBody>
    </Card>
  )
}
