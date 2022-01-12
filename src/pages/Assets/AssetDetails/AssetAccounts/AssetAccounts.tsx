import { Grid, Stack } from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { FeatureFlagEnum } from 'constants/FeatureFlagEnum'
import { useTranslate } from 'react-polyglot'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { useFeature } from 'hooks/useFeature/useFeature'

import { AssetAccountRow } from './AssetAccountRow'

type AssetAccountsProps = {
  CAIP19: CAIP19
}

export const AssetAccounts = ({ CAIP19 }: AssetAccountsProps) => {
  const translate = useTranslate()
  const assetAccountsFeature = useFeature(FeatureFlagEnum.Accounts)
  if (!assetAccountsFeature) return null
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
              lg: '2fr 150px repeat(2, 1fr)'
            }}
            gap='1rem'
            pl={4}
            pr={4}
            fontSize='sm'
            lineHeight='shorter'
          >
            <Text translation='accountRow.account' color='gray.500' />
            <Text
              translation='accountRow.allocation'
              color='gray.500'
              textAlign='right'
              display={{ base: 'none', lg: 'block' }}
            />
            <Text
              translation='accountRow.amount'
              display={{ base: 'none', md: 'block', lg: 'block' }}
              color='gray.500'
              textAlign='right'
            />
            <Text translation='accountRow.value' textAlign='right' color='gray.500' />
          </Grid>
          <AssetAccountRow />
        </Stack>
      </Card.Body>
    </Card>
  )
}
